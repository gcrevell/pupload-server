import type { DatabaseSync } from 'node:sqlite'
import type { SignInLimiter } from '../sessions/sign-in-limiter.ts'
import type { Settings } from '../settings/settings.ts'

export interface AppContext {
  db: DatabaseSync
  setupCode: string | undefined
  now: () => number
  settings: Settings
  signInLimiter: SignInLimiter
}
