import type { IncomingMessage } from 'node:http'

export interface ApiRequest {
  req: IncomingMessage
  url: URL
  json: () => Promise<Record<string, unknown>>
}
