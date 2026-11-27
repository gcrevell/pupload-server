import { sessionLifetime } from './sessions.ts'

export const sessionCookieName = 'pupload_session'

export function sessionCookie(token: string): string {
  return `${sessionCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionLifetime / 1000}`
}

export const clearedSessionCookie = `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`

export function sessionTokenFrom(cookieHeader: string | undefined): string | undefined {
  for (const part of (cookieHeader ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at !== -1 && part.slice(0, at).trim() === sessionCookieName) return part.slice(at + 1).trim()
  }
  return undefined
}
