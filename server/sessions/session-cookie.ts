import type { Settings } from '../settings/settings.ts'
import { sessionLifetime } from './sessions.ts'

export interface SessionCookies {
  set: (token: string) => string
  cleared: string
  tokenFrom: (cookieHeader: string | undefined) => string | undefined
}

export function sessionCookies({ publicUrl }: Pick<Settings, 'publicUrl'>): SessionCookies {
  const secure = publicUrl !== null && publicUrl.startsWith('https:')
  const name = secure ? '__Host-pupload_session' : 'pupload_session'
  const attributes = `${secure ? 'Secure; ' : ''}HttpOnly; SameSite=Lax; Path=/`
  return {
    set: (token) => `${name}=${token}; ${attributes}; Max-Age=${sessionLifetime / 1000}`,
    cleared: `${name}=; ${attributes}; Max-Age=0`,
    tokenFrom(cookieHeader) {
      for (const part of (cookieHeader ?? '').split(';')) {
        const at = part.indexOf('=')
        if (at !== -1 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim()
      }
      return undefined
    },
  }
}
