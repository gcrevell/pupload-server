import { createHash, randomBytes } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { UserRow } from '../api/v1/user-response.ts'

export const sessionLifetime = 30 * 24 * 60 * 60 * 1000
export const touchInterval = 60 * 60 * 1000

export function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

export function createSession(db: DatabaseSync, userId: number, now: number): string {
  const token = randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO sessions (user_id, token_hash, created_at, last_used_at) VALUES (?, ?, ?, ?)').run(userId, tokenHash(token), now, now)
  return token
}

export function deleteSession(db: DatabaseSync, sessionId: number): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
}

export function touchSession(db: DatabaseSync, sessionId: number, now: number): void {
  db.prepare('UPDATE sessions SET last_used_at = ? WHERE id = ?').run(now, sessionId)
}

export function deleteExpiredSessions(db: DatabaseSync, now: number): void {
  db.prepare('DELETE FROM sessions WHERE last_used_at < ?').run(now - sessionLifetime)
}

export function findSession(db: DatabaseSync, token: string): { sessionId: number; lastUsedAt: number; user: UserRow } | undefined {
  const row = db.prepare(`
    SELECT sessions.id AS session_id, sessions.last_used_at, users.id, users.username, users.is_admin, users.created_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(tokenHash(token)) as (UserRow & { session_id: number; last_used_at: number }) | undefined
  if (row === undefined) return undefined
  const { session_id: sessionId, last_used_at: lastUsedAt, ...user } = row
  return { sessionId, lastUsedAt, user }
}
