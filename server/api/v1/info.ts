import { serverVersion } from '../../version.ts'
import type { InfoResponse } from './info-response.ts'

export function info(): InfoResponse {
  return { version: serverVersion() }
}
