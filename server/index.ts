import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { hasAccounts } from './accounts/has-accounts.ts'
import { newSetupCode } from './accounts/setup-code.ts'
import { v1Routes } from './api/v1/routes.ts'
import { createApp } from './app.ts'
import { DatabaseError } from './db/database-error.ts'
import { databaseFile, openDatabase } from './db/open-database.ts'
import { deleteExpiredSessions } from './sessions/sessions.ts'
import { loadSettings, settingsFile } from './settings/load-settings.ts'
import { SettingsError } from './settings/settings-error.ts'
import { webDir } from './web-files.ts'

function fail(message: string): never {
  process.stderr.write(`Pupload didn't start. ${message}\n`)
  process.exit(1)
}

function load(file: string): ReturnType<typeof loadSettings> {
  try {
    return loadSettings(file)
  } catch (err) {
    if (err instanceof SettingsError) fail(err.message)
    throw err
  }
}

function open(file: string): ReturnType<typeof openDatabase> {
  try {
    return openDatabase(file)
  } catch (err) {
    if (err instanceof DatabaseError) fail(err.message)
    throw err
  }
}

if (!existsSync(webDir)) fail("Pupload's web UI isn't built. Run npm run build, then start it again.")

const file = settingsFile()
const { settings, created } = load(file)
if (created) process.stdout.write(`Wrote the default settings to ${file}.\n`)

const dbFile = databaseFile()
const db = open(dbFile)
deleteExpiredSessions(db, Date.now())
let setupCode: string | undefined
if (!hasAccounts(db)) {
  setupCode = newSetupCode()
  process.stdout.write(`Pupload has no accounts yet. Create the first one with the setup code ${setupCode}. A new code is made each time Pupload starts.\n`)
}

const { port } = settings
const server = createServer(createApp({ routes: v1Routes, db, webDir, setupCode, settings }))
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') fail(`Port ${port} is already in use. Stop whatever is using it, or change "port" in ${file}.`)
  fail(err.stack ?? err.message)
})
server.listen(port, () => {
  process.stdout.write(`Pupload is listening on port ${port}, with its settings in ${file} and its data in ${dbFile}.\n`)
})

process.on('SIGTERM', () => {
  server.close()
  server.closeAllConnections()
  db.close()
  process.exit(0)
})
