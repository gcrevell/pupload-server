import { strict as assert } from 'node:assert'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { DatabaseError } from '../server/db/database-error.ts'
import { loadMigrations, migrationsFolder } from '../server/db/load-migrations.ts'
import { openDatabase } from '../server/db/open-database.ts'

const dir = mkdtempSync(join(tmpdir(), 'pupload-migrations-'))
after(() => rmSync(dir, { recursive: true, force: true }))

let count = 0

function folderWith(files: Record<string, string>): string {
  const folder = join(dir, `folder-${count++}`)
  mkdirSync(folder)
  for (const [name, sql] of Object.entries(files)) writeFileSync(join(folder, name), sql)
  return folder
}

function refusal(message: string): (err: unknown) => boolean {
  return (err) => err instanceof DatabaseError && err.message.includes(message)
}

test('the real migrations build the users table and set user_version to how many there are', () => {
  const db = openDatabase(':memory:', loadMigrations())
  const tables = db.prepare(`SELECT name FROM sqlite_schema WHERE type = 'table'`).all().map((row) => row.name)
  assert.ok(tables.includes('users'))
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  assert.equal(row.user_version, readdirSync(migrationsFolder).filter((name) => !name.startsWith('.')).length)
  db.close()
})

test('files load in number order, whatever order they were written in, with their contents as written', () => {
  const folder = folderWith({
    '0003-third.sql': 'CREATE TABLE c (id INTEGER PRIMARY KEY)\n',
    '0001-first.sql': 'CREATE TABLE a (id INTEGER PRIMARY KEY);\nINSERT INTO a (id) VALUES (1);\n',
    '0002-second-one.sql': 'CREATE TABLE b (id INTEGER PRIMARY KEY)',
  })
  assert.deepEqual(loadMigrations(folder), [
    'CREATE TABLE a (id INTEGER PRIMARY KEY);\nINSERT INTO a (id) VALUES (1);\n',
    'CREATE TABLE b (id INTEGER PRIMARY KEY)',
    'CREATE TABLE c (id INTEGER PRIMARY KEY)\n',
  ])
})

test('files starting with a dot are skipped', () => {
  const folder = folderWith({ '.DS_Store': 'junk', '0001-first.sql': 'SELECT 1' })
  assert.deepEqual(loadMigrations(folder), ['SELECT 1'])
})

test('an empty folder has no migrations', () => {
  assert.deepEqual(loadMigrations(folderWith({})), [])
})

test('a file that is not named like a migration is refused, naming it', () => {
  for (const name of ['notes.txt', '1-first.sql', '0001_first.sql', '0001-First.sql', '0001-first.SQL', '0001-first-.sql', '00001-first.sql']) {
    const folder = folderWith({ '0001-create-users.sql': 'SELECT 1', [name]: 'SELECT 2' })
    assert.throws(() => loadMigrations(folder), refusal(`${join(folder, name)} isn't named like a migration.`), name)
  }
})

test('two files with the same number are refused, naming both', () => {
  const folder = folderWith({ '0001-first.sql': 'SELECT 1', '0002-second.sql': 'SELECT 2', '0002-other.sql': 'SELECT 3' })
  assert.throws(
    () => loadMigrations(folder),
    refusal(`${join(folder, '0002-other.sql')} and ${join(folder, '0002-second.sql')} are both migration 2.`),
  )
})

test('a gap in the numbers is refused, naming the folder and the missing number', () => {
  const folder = folderWith({ '0001-first.sql': 'SELECT 1', '0003-third.sql': 'SELECT 3' })
  assert.throws(() => loadMigrations(folder), refusal(`There's no migration 2 in ${folder}.`))
})

test('files that start at 0002 are missing migration 1', () => {
  const folder = folderWith({ '0002-second.sql': 'SELECT 2' })
  assert.throws(() => loadMigrations(folder), refusal(`There's no migration 1 in ${folder}.`))
})
