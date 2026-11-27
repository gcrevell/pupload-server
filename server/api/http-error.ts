import type { OutgoingHttpHeaders } from 'node:http'

export class HttpError extends Error {
  readonly status: number
  readonly headers: OutgoingHttpHeaders
  constructor(status: number, message: string, headers: OutgoingHttpHeaders = {}) {
    super(message)
    this.status = status
    this.headers = headers
  }
}
