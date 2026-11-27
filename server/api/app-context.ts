import type { DatabaseSync } from 'node:sqlite'

export interface AppContext {
  db: DatabaseSync
}
