import type { DatabaseSync } from 'node:sqlite'
import type { SignInLimiter } from '../sessions/sign-in-limiter.ts'

export interface AppContext {
  db: DatabaseSync
  setupCode: string | undefined
  now: () => number
  signInLimiter: SignInLimiter
}
