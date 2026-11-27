import { signedIn, type ApiRequest } from '../api-request.ts'
import type { ApiResponse } from '../api-response.ts'
import { userResponse, type UserResponse } from './user-response.ts'

export function me(request: ApiRequest): ApiResponse & { body: { user: UserResponse } } {
  return { body: { user: userResponse(signedIn(request).user) } }
}
