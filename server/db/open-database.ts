import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { configDir, writableFolderAdvice } from '../config-dir.ts'
import { messageOf } from '../message-of.ts'
import { DatabaseError } from './database-error.ts'
import { migrate } from './migrate.ts'
import { allMigrations } from './migrations.ts'

export function databaseFile(env: NodeJS.ProcessEnv = process.env): string {
  return join(configDir(env), 'pupload.db')
}

// SQLite's result codes: 8 is SQLITE_READONLY and 14 is SQLITE_CANTOPEN, and the high bits add detail.
const cantWriteCodes = [8, 14]

export function openDatabase(file: string, migrations: string[] = allMigrations): DatabaseSync {
  let db: DatabaseSync | undefined
  try {
    db = new DatabaseSync(file)
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA foreign_keys = ON')
    // SQLite keeps temporary files on disk by default, and a read-only container has no writable /tmp.
    db.exec('PRAGMA temp_store = MEMORY')
    migrate(db, migrations)
    return db
  } catch (err) {
    if (db?.isOpen) db.close()
    const errcode = (err as { errcode?: unknown }).errcode
    if (typeof errcode === 'number' && cantWriteCodes.includes(errcode & 0xff)) {
      throw new DatabaseError(`Couldn't open ${file}. ${messageOf(err)} ${writableFolderAdvice(dirname(file))}`)
    }
    throw err
  }
}
