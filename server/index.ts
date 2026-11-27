import { createServer } from 'node:http'
import { handleRequest } from './app.ts'
import { loadSettings, settingsFile } from './settings/load-settings.ts'
import { SettingsError } from './settings/settings-error.ts'

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

const file = settingsFile()
const { settings, created } = load(file)
if (created) process.stdout.write(`Wrote the default settings to ${file}.\n`)

const { port } = settings
const server = createServer(handleRequest)
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') fail(`Port ${port} is already in use. Stop whatever is using it, or change "port" in ${file}.`)
  fail(err.stack ?? err.message)
})
server.listen(port, () => {
  process.stdout.write(`Pupload is listening on port ${port}, with its settings in ${file}.\n`)
})

process.on('SIGTERM', () => {
  server.close()
  server.closeAllConnections()
  process.exit(0)
})
