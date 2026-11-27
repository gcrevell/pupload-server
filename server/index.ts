import { createServer } from 'node:http'
import { handleRequest } from './app.ts'

function fail(message: string): never {
  process.stderr.write(`Pupload didn't start. ${message}\n`)
  process.exit(1)
}

function port(): number {
  const value = process.env.PORT ?? '8080'
  const number = Number(value)
  if (!/^\d+$/.test(value) || number > 65535) fail(`PORT is "${value}". Set it to a port number such as 8080.`)
  return number
}

const listenOn = port()
const server = createServer(handleRequest)
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') fail(`Port ${listenOn} is already in use. Stop whatever is using it, or set PORT to a free port.`)
  fail(err.stack ?? err.message)
})
server.listen(listenOn, () => {
  process.stdout.write(`Pupload is listening on port ${listenOn}.\n`)
})

process.on('SIGTERM', () => {
  server.close()
  server.closeAllConnections()
  process.exit(0)
})
