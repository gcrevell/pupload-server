import { createHash, randomBytes } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'

export function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

export function createSession(db: DatabaseSync, userId: number, now: number): string {
  const token = randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO sessions (user_id, token_hash, created_at, last_used_at) VALUES (?, ?, ?, ?)').run(userId, tokenHash(token), now, now)
  return token
}
