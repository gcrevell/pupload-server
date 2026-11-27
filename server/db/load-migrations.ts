import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseError } from './database-error.ts'

export const migrationsFolder = join(import.meta.dirname, 'migrations')

const migrationName = /^(\d{4})-[a-z0-9]+(-[a-z0-9]+)*\.sql$/

export function loadMigrations(folder: string = migrationsFolder): string[] {
  const files: { name: string; number: number }[] = []
  for (const name of readdirSync(folder)) {
    if (name.startsWith('.')) continue
    const match = migrationName.exec(name)
    if (!match) {
      throw new DatabaseError(`${join(folder, name)} isn't named like a migration. Name it NNNN-what-it-does.sql, numbered after the last one, like 0001-create-users.sql.`)
    }
    files.push({ name, number: Number(match[1]) })
  }
  files.sort((a, b) => a.number - b.number || (a.name < b.name ? -1 : 1))

  for (const [i, file] of files.entries()) {
    const previous = files[i - 1]
    if (previous?.number === file.number) {
      throw new DatabaseError(`${join(folder, previous.name)} and ${join(folder, file.name)} are both migration ${file.number}. Renumber one of them after the last migration.`)
    }
    if (file.number !== i + 1) {
      throw new DatabaseError(`There's no migration ${i + 1} in ${folder}. Migrations are numbered from 0001 with no gaps.`)
    }
  }

  return files.map((file) => readFileSync(join(folder, file.name), 'utf8'))
}
