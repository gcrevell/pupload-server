import type { ApiRequest } from '../api/api-request.ts'
import type { AppContext } from '../api/app-context.ts'
import { HttpError } from '../api/http-error.ts'
import type { Route } from '../api/route.ts'
import { clearedSessionCookie, sessionCookie, sessionTokenFrom } from './session-cookie.ts'
import { deleteSession, findSession, sessionLifetime, touchInterval, touchSession } from './sessions.ts'

export function authenticate(route: Route, request: ApiRequest, { db, now }: AppContext): string | undefined {
  const auth = route.auth ?? 'user'
  if (auth === 'public') return undefined

  const token = sessionTokenFrom(request.req.headers.cookie)
  const session = token === undefined ? undefined : findSession(db, token)
  if (token === undefined || session === undefined) {
    throw new HttpError(401, 'Sign in first.', token === undefined ? {} : { 'Set-Cookie': clearedSessionCookie })
  }
  const idle = now() - session.lastUsedAt
  if (idle > sessionLifetime) {
    deleteSession(db, session.sessionId)
    throw new HttpError(401, 'Sign in first.', { 'Set-Cookie': clearedSessionCookie })
  }
  if (auth === 'admin' && session.user.is_admin !== 1) throw new HttpError(403, 'Only an admin can do that.')

  request.user = session.user
  request.sessionId = session.sessionId
  if (idle < touchInterval) return undefined
  touchSession(db, session.sessionId, now())
  return sessionCookie(token)
}
