import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { sessionCookies } from '../server/sessions/session-cookie.ts'
import { defaultSettings } from '../server/settings/default-settings.ts'
import { createSession, deleteExpiredSessions, sessionLifetime } from '../server/sessions/sessions.ts'
import { createAccount, sessionToken, signIn } from './helpers/sign-in.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

const minute = 60 * 1000
const day = 24 * 60 * minute
const { set: sessionCookie } = sessionCookies(defaultSettings)
const cleared = 'pupload_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'

async function withApp(run: (app: StartedApp, token: string, clock: { t: number }) => void | Promise<void>): Promise<void> {
  const clock = { t: 0 }
  const app = await startApp({ routes: v1Routes, now: () => clock.t })
  try {
    await createAccount(app)
    await run(app, sessionToken(await signIn(app)), clock)
  } finally {
    await app.close()
  }
}

function me(app: StartedApp, token: string): Promise<Response> {
  return fetch(`${app.base}/api/v1/me`, { headers: { Cookie: `pupload_session=${token}` } })
}

function lastUsed(app: StartedApp): number[] {
  return app.db.prepare('SELECT last_used_at FROM sessions ORDER BY id').all().map((row) => row.last_used_at as number)
}

test('a session used again within the hour is not touched or resent', () => withApp(async (app, token, clock) => {
  clock.t = 59 * minute
  const res = await me(app, token)
  assert.equal(res.status, 200)
  assert.deepEqual(res.headers.getSetCookie(), [])
  assert.deepEqual(lastUsed(app), [0])
}))

test('a session used after the hour is touched and its cookie sent again', () => withApp(async (app, token, clock) => {
  clock.t = 61 * minute
  const res = await me(app, token)
  assert.equal(res.status, 200)
  assert.deepEqual(res.headers.getSetCookie(), [sessionCookie(token)])
  assert.match(sessionCookie(token), /Max-Age=2592000$/)
  assert.deepEqual(lastUsed(app), [61 * minute])
}))

test('a session used every 20 days stays signed in', () => withApp(async (app, token, clock) => {
  for (let i = 1; i <= 3; i++) {
    clock.t = i * 20 * day
    const res = await me(app, token)
    assert.equal(res.status, 200)
    assert.deepEqual(res.headers.getSetCookie(), [sessionCookie(token)])
  }
}))

test('a session unused for exactly 30 days still works', () => withApp(async (app, token, clock) => {
  clock.t = sessionLifetime
  assert.equal((await me(app, token)).status, 200)
}))

test('a session unused for 30 days and 1 ms is refused, cleared and deleted', () => withApp(async (app, token, clock) => {
  clock.t = sessionLifetime + 1
  const res = await me(app, token)
  assert.equal(res.status, 401)
  assert.deepEqual(res.headers.getSetCookie(), [cleared])
  assert.deepEqual(lastUsed(app), [])
}))

test('deleteExpiredSessions removes only the expired sessions', () => withApp((app) => {
  const { id } = app.db.prepare(`SELECT id FROM users WHERE username = 'alex'`).get() as { id: number }
  const now = 100 * day
  for (const usedAt of [now - sessionLifetime - 1, now - sessionLifetime, now - sessionLifetime + 1, now]) createSession(app.db, id, usedAt)
  deleteExpiredSessions(app.db, now)
  assert.deepEqual(lastUsed(app), [now - sessionLifetime, now - sessionLifetime + 1, now])
}))

test('signing out when a refresh is due sends only the cleared cookie', () => withApp(async (app, token, clock) => {
  clock.t = 61 * minute
  const res = await fetch(`${app.base}/api/v1/sessions/current`, { method: 'DELETE', headers: { Cookie: `pupload_session=${token}` } })
  assert.equal(res.status, 204)
  assert.deepEqual(res.headers.getSetCookie(), [cleared])
}))

test('with an https publicUrl, the resent cookie is the Secure __Host- one', async () => {
  const clock = { t: 0 }
  const app = await startApp({ routes: v1Routes, now: () => clock.t, settings: { ...defaultSettings, publicUrl: 'https://pupload.example.com' } })
  try {
    await createAccount(app)
    const token = sessionToken(await signIn(app))
    clock.t = 61 * minute
    const res = await fetch(`${app.base}/api/v1/me`, { headers: { Cookie: `__Host-pupload_session=${token}` } })
    assert.equal(res.status, 200)
    assert.deepEqual(res.headers.getSetCookie(), [`__Host-pupload_session=${token}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`])
  } finally {
    await app.close()
  }
})
