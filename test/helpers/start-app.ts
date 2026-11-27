import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, type AppOptions } from '../../server/app.ts'

export interface StartedApp {
  base: string
  close: () => Promise<void>
}

export async function startApp(options: AppOptions): Promise<StartedApp> {
  const server = createServer(createApp(options))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () => new Promise<void>((resolve) => {
      server.close(() => resolve())
      server.closeAllConnections()
    }),
  }
}
