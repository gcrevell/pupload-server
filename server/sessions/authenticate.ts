import type { ApiRequest } from '../api/api-request.ts'
import type { AppContext } from '../api/app-context.ts'
import { HttpError } from '../api/http-error.ts'
import type { Route } from '../api/route.ts'
import { clearedSessionCookie, sessionTokenFrom } from './session-cookie.ts'
import { findSession } from './sessions.ts'

export function authenticate(route: Route, request: ApiRequest, { db }: AppContext): void {
  const auth = route.auth ?? 'user'
  if (auth === 'public') return

  const token = sessionTokenFrom(request.req.headers.cookie)
  const session = token === undefined ? undefined : findSession(db, token)
  if (session === undefined) {
    throw new HttpError(401, 'Sign in first.', token === undefined ? {} : { 'Set-Cookie': clearedSessionCookie })
  }
  if (auth === 'admin' && session.user.is_admin !== 1) throw new HttpError(403, 'Only an admin can do that.')
  request.user = session.user
  request.sessionId = session.sessionId
}
