import { createServer } from 'node:http'
import { handleRequest } from './app.ts'
import { EnvError, readEnv, type Env } from './env.ts'

function fail(message: string): never {
  process.stderr.write(`Pupload didn't start. ${message}\n`)
  process.exit(1)
}

function loadEnv(): Env {
  try {
    return readEnv()
  } catch (err) {
    if (err instanceof EnvError) fail(err.message)
    throw err
  }
}

const { port } = loadEnv()
const server = createServer(handleRequest)
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') fail(`Port ${port} is already in use. Stop whatever is using it, or set PORT to a free port.`)
  fail(err.stack ?? err.message)
})
server.listen(port, () => {
  process.stdout.write(`Pupload is listening on port ${port}.\n`)
})

process.on('SIGTERM', () => {
  server.close()
  server.closeAllConnections()
  process.exit(0)
})
