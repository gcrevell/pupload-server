import type { DatabaseSync } from 'node:sqlite'
import { DatabaseError } from './database-error.ts'

export function migrate(db: DatabaseSync, migrations: string[]): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  const applied = row.user_version
  if (applied > migrations.length) {
    const file = db.location() ?? ':memory:'
    throw new DatabaseError(`${file} is from a newer Pupload. Its data is at version ${applied}, and this Pupload only knows up to ${migrations.length}. Run the newer image again.`)
  }
  for (let n = applied + 1; n <= migrations.length; n++) {
    db.exec('BEGIN')
    try {
      db.exec(migrations[n - 1])
      db.exec(`PRAGMA user_version = ${n}`)
      db.exec('COMMIT')
    } catch (err) {
      if (db.isTransaction) db.exec('ROLLBACK')
      throw err
    }
  }
}
