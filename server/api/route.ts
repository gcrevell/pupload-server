import type { ApiRequest } from './api-request.ts'
import type { ApiResponse } from './api-response.ts'

export interface Route {
  method: string
  path: string
  handle: (request: ApiRequest) => ApiResponse | Promise<ApiResponse>
}
