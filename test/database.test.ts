import { strict as assert } from 'node:assert'
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, test } from 'node:test'
import { DatabaseError } from '../server/db/database-error.ts'
import { databaseFile, openDatabase } from '../server/db/open-database.ts'

const dir = mkdtempSync(join(tmpdir(), 'pupload-database-'))
after(() => rmSync(dir, { recursive: true, force: true }))

const first = 'CREATE TABLE a (id INTEGER PRIMARY KEY); INSERT INTO a (id) VALUES (1);'
const second = 'CREATE TABLE b (id INTEGER PRIMARY KEY)'
const third = 'CREATE TABLE c (id INTEGER PRIMARY KEY)'

function version(db: DatabaseSync): number {
  return (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version
}

function tables(db: DatabaseSync): string[] {
  return db.prepare(`SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name`).all().map((row) => row.name as string)
}

test('the database file is pupload.db in the config folder', () => {
  assert.equal(databaseFile({}), resolve('config', 'pupload.db'))
  assert.equal(databaseFile({ PUPLOAD_CONFIG_DIR: '/config' }), '/config/pupload.db')
})

test('migrations apply in order and leave user_version at the number applied', () => {
  const db = openDatabase(':memory:', [first, second])
  assert.deepEqual(tables(db), ['a', 'b'])
  assert.equal(version(db), 2)
  db.close()
})

test('opening again applies only the migrations that are new', () => {
  const file = join(dir, 'again.db')
  openDatabase(file, [first, second]).close()
  const db = openDatabase(file, [first, second, third])
  assert.deepEqual(tables(db), ['a', 'b', 'c'])
  assert.equal(version(db), 3)
  db.close()
})

test('a migration that fails leaves its tables out and user_version unchanged', () => {
  const file = join(dir, 'failing.db')
  openDatabase(file, [first]).close()
  assert.throws(() => openDatabase(file, [first, 'CREATE TABLE b (id INTEGER); INSERT INTO nope VALUES (1)']), /no such table: nope/)
  const db = new DatabaseSync(file)
  assert.deepEqual(tables(db), ['a'])
  assert.equal(version(db), 1)
  db.close()
})

test('a database from a newer Pupload is refused', () => {
  const file = join(dir, 'newer.db')
  const db = new DatabaseSync(file)
  db.exec('PRAGMA user_version = 5')
  db.close()
  assert.throws(
    () => openDatabase(file, [first, second]),
    (err) => err instanceof DatabaseError && err.message === `${realpathSync(file)} is from a newer Pupload. Its data is at version 5, and this Pupload only knows up to 2. Run the newer image again.`,
  )
})

test('a file database is in WAL mode, with foreign keys on', () => {
  const db = openDatabase(join(dir, 'wal.db'), [])
  assert.deepEqual({ ...db.prepare('PRAGMA journal_mode').get() }, { journal_mode: 'wal' })
  assert.deepEqual({ ...db.prepare('PRAGMA foreign_keys').get() }, { foreign_keys: 1 })
  db.close()
})

test('a folder Pupload cannot write to is refused, naming the user and the folder', { skip: process.getuid() === 0 && 'root can write anywhere' }, () => {
  const locked = join(dir, 'locked')
  mkdirSync(locked)
  const file = join(locked, 'pupload.db')
  openDatabase(file, []).close()
  chmodSync(locked, 0o500)
  try {
    assert.throws(
      () => openDatabase(file, []),
      (err) => err instanceof DatabaseError
        && err.message.startsWith(`Couldn't open ${file}. attempt to write a readonly database.`)
        && err.message.includes(`Pupload runs as user ${process.getuid()}, so let it write to ${locked}:`),
    )
  } finally {
    chmodSync(locked, 0o700)
  }
})

test('a folder that does not exist is refused, naming the user and the folder', () => {
  const missing = join(dir, 'missing')
  assert.throws(
    () => openDatabase(join(missing, 'pupload.db'), []),
    (err) => err instanceof DatabaseError
      && err.message.startsWith(`Couldn't open ${join(missing, 'pupload.db')}. unable to open database file.`)
      && err.message.includes(`so let it write to ${missing}:`),
  )
})
