import type { IncomingMessage } from 'node:http'
import type { UserRow } from './v1/user-response.ts'

export interface ApiRequest {
  req: IncomingMessage
  url: URL
  ip: string
  json: () => Promise<Record<string, unknown>>
  user: UserRow | undefined
  sessionId: number | undefined
}

export function signedIn(request: ApiRequest): { user: UserRow; sessionId: number } {
  const { user, sessionId } = request
  if (user === undefined || sessionId === undefined) throw new Error('This route needs auth set to user or admin to know who is signed in.')
  return { user, sessionId }
}
