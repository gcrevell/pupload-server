import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { DatabaseSync } from 'node:sqlite'
import { createApp, type AppOptions } from '../../server/app.ts'
import { openDatabase } from '../../server/db/open-database.ts'

export interface StartedApp {
  base: string
  db: DatabaseSync
  close: () => Promise<void>
}

export async function startApp(options: Omit<AppOptions, 'db'> & { db?: DatabaseSync }): Promise<StartedApp> {
  const db = options.db ?? openDatabase(':memory:')
  const server = createServer(createApp({ ...options, db }))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    db,
    close: () => new Promise<void>((resolve) => {
      server.close(() => {
        db.close()
        resolve()
      })
      server.closeAllConnections()
    }),
  }
}
