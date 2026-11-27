import type { IncomingMessage } from 'node:http'

export interface Route {
  method: string
  path: string
  handle: (req: IncomingMessage) => unknown
}
