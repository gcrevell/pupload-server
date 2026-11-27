import { hasAccounts } from '../../accounts/has-accounts.ts'
import type { ApiRequest } from '../api-request.ts'
import type { ApiResponse } from '../api-response.ts'
import type { AppContext } from '../app-context.ts'
import { serverVersion } from '../../version.ts'
import type { InfoResponse } from './info-response.ts'

export function info(_request: ApiRequest, { db }: AppContext): ApiResponse & { body: InfoResponse } {
  return { body: { version: serverVersion(), setupNeeded: !hasAccounts(db) } }
}
