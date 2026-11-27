import { randomBytes } from 'node:crypto'
import { hashPassword, verifyPassword } from '../../accounts/passwords.ts'
import { clearedSessionCookie, sessionCookie } from '../../sessions/session-cookie.ts'
import { createSession, deleteSession } from '../../sessions/sessions.ts'
import { signedIn, type ApiRequest } from '../api-request.ts'
import type { ApiResponse } from '../api-response.ts'
import type { AppContext } from '../app-context.ts'
import { HttpError } from '../http-error.ts'
import { stringFields } from '../string-fields.ts'
import { userResponse, type UserResponse, type UserRow } from './user-response.ts'

// Started when the routes load, so the first unknown username doesn't wait for two hashes.
const dummyHash = hashPassword(randomBytes(16).toString('base64url'))

export async function signIn(request: ApiRequest, { db, now, signInLimiter }: AppContext): Promise<ApiResponse & { body: { user: UserResponse } }> {
  const { username, password } = stringFields(await request.json(), ['username', 'password'])
  signInLimiter.attempt(request.ip, username)

  const row = db.prepare('SELECT id, username, password_hash, is_admin, created_at FROM users WHERE username = ?').get(username) as (UserRow & { password_hash: string }) | undefined
  const account = row !== undefined && row.password_hash !== '' ? row : undefined
  const matches = await verifyPassword(password, account?.password_hash ?? await dummyHash)
  if (account === undefined || !matches) throw new HttpError(401, "That username and password don't match an account.")

  signInLimiter.succeeded(request.ip, username)
  const token = createSession(db, account.id, now())
  return { status: 201, headers: { 'Set-Cookie': sessionCookie(token) }, body: { user: userResponse(account) } }
}

export function signOut(request: ApiRequest, { db }: AppContext): ApiResponse {
  deleteSession(db, signedIn(request).sessionId)
  return { status: 204, headers: { 'Set-Cookie': clearedSessionCookie } }
}
