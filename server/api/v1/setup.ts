import { checkPassword, checkUsername } from '../../accounts/account-rules.ts'
import { hasAccounts } from '../../accounts/has-accounts.ts'
import { hashPassword } from '../../accounts/passwords.ts'
import { setupCodeMatches } from '../../accounts/setup-code.ts'
import type { ApiRequest } from '../api-request.ts'
import type { ApiResponse } from '../api-response.ts'
import type { AppContext } from '../app-context.ts'
import { HttpError } from '../http-error.ts'
import { stringFields } from '../string-fields.ts'
import { userResponse, type UserResponse, type UserRow } from './user-response.ts'

export async function setup(request: ApiRequest, { db, setupCode, now }: AppContext): Promise<ApiResponse & { body: { user: UserResponse } }> {
  if (hasAccounts(db)) throw alreadySetUp()
  const { code, username, password } = stringFields(await request.json(), ['code', 'username', 'password'])
  if (!setupCodeMatches(setupCode, code)) {
    throw new HttpError(403, "That setup code isn't right. Pupload prints the current one in its log when it starts.")
  }
  checkUsername(username)
  checkPassword(password)
  const hash = await hashPassword(password)

  const row = db.prepare(`
    INSERT INTO users (username, password_hash, is_admin, created_at)
    SELECT ?, ?, 1, ? WHERE NOT EXISTS (SELECT 1 FROM users)
    RETURNING id, username, is_admin, created_at
  `).get(username, hash, now()) as UserRow | undefined
  if (row === undefined) throw alreadySetUp()
  return { status: 201, body: { user: userResponse(row) } }
}

function alreadySetUp(): HttpError {
  return new HttpError(409, 'Pupload already has an account. Sign in instead.')
}
