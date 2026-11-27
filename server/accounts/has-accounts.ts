import type { DatabaseSync } from 'node:sqlite'

export function hasAccounts(db: DatabaseSync): boolean {
  const row = db.prepare('SELECT EXISTS (SELECT 1 FROM users) AS found').get() as { found: number }
  return row.found === 1
}
