import { createHash, randomBytes } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { UserRow } from '../api/v1/user-response.ts'

export function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

export function createSession(db: DatabaseSync, userId: number, now: number): string {
  const token = randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO sessions (user_id, token_hash, created_at, last_used_at) VALUES (?, ?, ?, ?)').run(userId, tokenHash(token), now, now)
  return token
}

export function findSession(db: DatabaseSync, token: string): { sessionId: number; user: UserRow } | undefined {
  const row = db.prepare(`
    SELECT sessions.id AS session_id, users.id, users.username, users.is_admin, users.created_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(tokenHash(token)) as (UserRow & { session_id: number }) | undefined
  if (row === undefined) return undefined
  const { session_id: sessionId, ...user } = row
  return { sessionId, user }
}
