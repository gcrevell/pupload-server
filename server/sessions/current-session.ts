import type { AppContext } from '../api/app-context.ts'
import { deleteSession, findSession, sessionLifetime } from './sessions.ts'

type Session = NonNullable<ReturnType<typeof findSession>>

export type CurrentSession = { token: string; session: Session } | { token: string | undefined; session: undefined }

export function currentSession(cookieHeader: string | undefined, { db, now, cookies }: Pick<AppContext, 'db' | 'now' | 'cookies'>): CurrentSession {
  const token = cookies.tokenFrom(cookieHeader)
  const session = token === undefined ? undefined : findSession(db, token)
  if (token === undefined || session === undefined) return { token, session: undefined }
  if (now() - session.lastUsedAt <= sessionLifetime) return { token, session }
  deleteSession(db, session.sessionId)
  return { token, session: undefined }
}
