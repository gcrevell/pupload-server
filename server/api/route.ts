import type { ApiRequest } from './api-request.ts'
import type { ApiResponse } from './api-response.ts'
import type { AppContext } from './app-context.ts'

export interface Route {
  method: string
  path: string
  auth?: 'public' | 'user' | 'admin'
  handle: (request: ApiRequest, context: AppContext) => ApiResponse | Promise<ApiResponse>
}
