import { HttpError } from '../api/http-error.ts'

export interface SignInLimiter {
  attempt: (ip: string, username: string) => void
  succeeded: (ip: string, username: string) => void
}

interface Entry {
  times: number[]
  logged: boolean
}

const windowMs = 15 * 60 * 1000
const sweepEveryMs = 60 * 1000
const maxAttempts = 10

export function createSignInLimiter(
  now: () => number,
  { maxKeys = 10_000, log = (line) => void process.stdout.write(`${line}\n`) }: { maxKeys?: number; log?: (line: string) => void } = {},
): SignInLimiter {
  const entries = new Map<string, Entry>()
  let lastSweep = now()
  let fullLogged = false

  function keyOf(ip: string, username: string): string {
    return `${ip} ${username.toLowerCase()}`
  }

  function dropExpired(entry: Entry, at: number): void {
    entry.times = entry.times.filter((time) => at - time < windowMs)
  }

  function sweep(at: number): void {
    for (const [key, entry] of entries) {
      dropExpired(entry, at)
      if (entry.times.length === 0) entries.delete(key)
    }
    lastSweep = at
    if (entries.size < maxKeys) fullLogged = false
  }

  function paused(seconds: number): HttpError {
    const minutes = Math.ceil(seconds / 60)
    return new HttpError(429, `Too many failed sign-ins. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`, { 'Retry-After': String(seconds) })
  }

  return {
    attempt(ip, username) {
      const at = now()
      if (at - lastSweep >= sweepEveryMs) sweep(at)

      const key = keyOf(ip, username)
      const entry = entries.get(key)
      if (entry !== undefined) {
        dropExpired(entry, at)
        if (entry.times.length < maxAttempts) entry.logged = false
        else {
          if (!entry.logged) {
            entry.logged = true
            log(`Paused sign-in for ${JSON.stringify(username)} from ${ip} after ${maxAttempts} failures in 15 minutes.`)
          }
          throw paused(Math.ceil(((entry.times[0]) + windowMs - at) / 1000))
        }
      } else if (entries.size >= maxKeys) {
        if (!fullLogged) {
          fullLogged = true
          log(`Paused sign-in for usernames and addresses it hasn't seen, since ${maxKeys} have failed sign-ins in the last 15 minutes.`)
        }
        throw paused(windowMs / 1000)
      }

      if (entry === undefined) entries.set(key, { times: [at], logged: false })
      else entry.times.push(at)
    },

    succeeded(ip, username) {
      entries.delete(keyOf(ip, username))
    },
  }
}
