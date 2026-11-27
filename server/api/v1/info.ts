import type { ApiResponse } from '../api-response.ts'
import { serverVersion } from '../../version.ts'
import type { InfoResponse } from './info-response.ts'

export function info(): ApiResponse & { body: InfoResponse } {
  return { body: { version: serverVersion() } }
}
