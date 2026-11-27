import type { Route } from '../route.ts'
import { info } from './info.ts'
import { me } from './me.ts'
import { signIn, signOut } from './sessions.ts'
import { setup } from './setup.ts'

export const v1Routes: Route[] = [
  { method: 'GET', path: '/api/v1/info', auth: 'public', handle: info },
  { method: 'POST', path: '/api/v1/setup', auth: 'public', handle: setup },
  { method: 'POST', path: '/api/v1/sessions', auth: 'public', handle: signIn },
  { method: 'DELETE', path: '/api/v1/sessions/current', handle: signOut },
  { method: 'GET', path: '/api/v1/me', handle: me },
]
