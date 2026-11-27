import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { HttpError } from '../server/api/http-error.ts'
import { createSignInLimiter, type SignInLimiter } from '../server/sessions/sign-in-limiter.ts'

const minute = 60 * 1000
const ip = '192.0.2.10'

function setup(options: { maxKeys?: number } = {}): { limiter: SignInLimiter; log: string[]; at: (ms: number) => void } {
  let t = 0
  const log: string[] = []
  const limiter = createSignInLimiter(() => t, { ...options, log: (line) => log.push(line) })
  return { limiter, log, at: (ms) => { t = ms } }
}

function tenAttempts(limiter: SignInLimiter, address = ip, username = 'alex'): void {
  for (let i = 0; i < 10; i++) limiter.attempt(address, username)
}

function paused(limiter: SignInLimiter, address: string, username: string, retryAfter: string, wait: string): void {
  assert.throws(
    () => limiter.attempt(address, username),
    (err) => err instanceof HttpError
      && err.status === 429
      && err.headers['Retry-After'] === retryAfter
      && err.message === `Too many failed sign-ins. Try again in ${wait}.`,
  )
}

test('ten attempts pass and the eleventh is paused for 15 minutes', () => {
  const { limiter } = setup()
  tenAttempts(limiter)
  paused(limiter, ip, 'alex', '900', '15 minutes')
})

test('the pause counts down, and ends 15 minutes after the attempts', () => {
  const { limiter, at } = setup()
  tenAttempts(limiter)
  at(15 * minute - 1)
  paused(limiter, ip, 'alex', '1', '1 minute')
  at(15 * minute)
  limiter.attempt(ip, 'alex')
})

test('Retry-After counts from the oldest of the ten attempts', () => {
  const { limiter, at } = setup()
  for (let i = 0; i < 10; i++) {
    at(i * minute)
    limiter.attempt(ip, 'alex')
  }
  at(10 * minute)
  paused(limiter, ip, 'alex', '300', '5 minutes')
  at(10 * minute + 1500)
  paused(limiter, ip, 'alex', '299', '5 minutes')
  at(10 * minute + 61 * 1000)
  paused(limiter, ip, 'alex', '239', '4 minutes')
})

test('a paused attempt is not recorded, so more of them do not extend the pause', () => {
  const { limiter, at } = setup()
  tenAttempts(limiter)
  for (let i = 1; i <= 5; i++) {
    at(i * minute)
    paused(limiter, ip, 'alex', String(900 - i * 60), `${15 - i} minutes`)
  }
  at(15 * minute)
  limiter.attempt(ip, 'alex')
})

test('another username, another address, and the same username in another case', () => {
  const { limiter } = setup()
  tenAttempts(limiter)
  limiter.attempt(ip, 'sam')
  limiter.attempt('198.51.100.7', 'alex')
  paused(limiter, ip, 'ALEX', '900', '15 minutes')
  paused(limiter, ip, 'Alex', '900', '15 minutes')
})

test('a success clears the count', () => {
  const { limiter } = setup()
  for (let i = 0; i < 9; i++) limiter.attempt(ip, 'alex')
  limiter.succeeded(ip, 'ALEX')
  for (let i = 0; i < 9; i++) limiter.attempt(ip, 'alex')
})

test('a pause is logged once, and again after a later pause', () => {
  const { limiter, log, at } = setup()
  tenAttempts(limiter)
  for (let i = 0; i < 3; i++) paused(limiter, ip, 'alex', '900', '15 minutes')
  assert.deepEqual(log, [`Paused sign-in for "alex" from ${ip} after 10 failures in 15 minutes.`])

  at(15 * minute)
  tenAttempts(limiter)
  paused(limiter, ip, 'alex', '900', '15 minutes')
  paused(limiter, ip, 'alex', '900', '15 minutes')
  assert.equal(log.length, 2)
})

test('a newline in a username is escaped in the log', () => {
  const { limiter, log } = setup()
  tenAttempts(limiter, ip, 'alex\nPupload forged this')
  assert.throws(() => limiter.attempt(ip, 'alex\nPupload forged this'), HttpError)
  assert.equal(log.length, 1)
  assert.equal(log[0], `Paused sign-in for "alex\\nPupload forged this" from ${ip} after 10 failures in 15 minutes.`)
  assert.ok(!(log[0] as string).includes('\n'))
})

test('a full map pauses keys it has not seen, once in the log, and frees up after the window', () => {
  const { limiter, log, at } = setup({ maxKeys: 3 })
  for (const name of ['a', 'b', 'c']) limiter.attempt(ip, name)
  paused(limiter, ip, 'd', '900', '15 minutes')
  paused(limiter, ip, 'e', '900', '15 minutes')
  assert.deepEqual(log, [`Paused sign-in for usernames and addresses it hasn't seen, since 3 have failed sign-ins in the last 15 minutes.`])
  limiter.attempt(ip, 'a')

  at(15 * minute)
  limiter.attempt(ip, 'd')
  limiter.attempt(ip, 'e')
})

test('the full-map pause is logged again when the map fills again', () => {
  const { limiter, log, at } = setup({ maxKeys: 1 })
  limiter.attempt(ip, 'a')
  paused(limiter, ip, 'b', '900', '15 minutes')
  at(15 * minute)
  limiter.attempt(ip, 'b')
  paused(limiter, ip, 'c', '900', '15 minutes')
  assert.equal(log.length, 2)
})
