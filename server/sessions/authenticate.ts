import type { ApiRequest } from '../api/api-request.ts'
import type { AppContext } from '../api/app-context.ts'
import { HttpError } from '../api/http-error.ts'
import type { Route } from '../api/route.ts'
import { currentSession } from './current-session.ts'
import { touchInterval, touchSession } from './sessions.ts'

export function authenticate(route: Route, request: ApiRequest, context: AppContext): string | undefined {
  const auth = route.auth ?? 'user'
  if (auth === 'public') return undefined

  const { db, now, cookies } = context
  const current = currentSession(request.req.headers.cookie, context)
  if (current.session === undefined) {
    throw new HttpError(401, 'Sign in first.', current.token === undefined ? {} : { 'Set-Cookie': cookies.cleared })
  }
  const { token, session } = current
  if (auth === 'admin' && session.user.is_admin !== 1) throw new HttpError(403, 'Only an admin can do that.')

  request.user = session.user
  request.sessionId = session.sessionId
  if (now() - session.lastUsedAt < touchInterval) return undefined
  touchSession(db, session.sessionId, now())
  return cookies.set(token)
}
