import type { Route } from '../route.ts'
import { info } from './info.ts'
import { signIn } from './sessions.ts'
import { setup } from './setup.ts'

export const v1Routes: Route[] = [
  { method: 'GET', path: '/api/v1/info', handle: info },
  { method: 'POST', path: '/api/v1/setup', handle: setup },
  { method: 'POST', path: '/api/v1/sessions', handle: signIn },
]
