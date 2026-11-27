import type { OutgoingHttpHeaders } from 'node:http'

export interface ApiResponse {
  status?: number
  headers?: OutgoingHttpHeaders
  body?: unknown
}
