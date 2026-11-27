import type { Route } from '../route.ts'
import { info } from './info.ts'

export const v1Routes: Route[] = [
  { method: 'GET', path: '/api/v1/info', handle: info },
]
