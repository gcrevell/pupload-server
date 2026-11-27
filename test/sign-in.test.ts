import { createHash } from 'node:crypto'
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { createAccount, password, sessionToken, signIn } from './helpers/sign-in.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

const noMatch = { error: "That username and password don't match an account." }

async function withAccount(run: (app: StartedApp) => Promise<void>): Promise<void> {
  const app = await startApp({ routes: v1Routes })
  try {
    await createAccount(app)
    await run(app)
  } finally {
    await app.close()
  }
}

function sessionRows(app: StartedApp): Record<string, unknown>[] {
  return app.db.prepare('SELECT * FROM sessions').all().map((row) => ({ ...row }))
}

test('signing in answers 201 with the user and a session cookie', () => withAccount(async (app) => {
  const res = await signIn(app)
  assert.equal(res.status, 201)
  const { user } = await res.json() as { user: { id: number; username: string; isAdmin: boolean; createdAt: string } }
  assert.deepEqual(Object.keys(user), ['id', 'username', 'isAdmin', 'createdAt'])
  assert.equal(user.username, 'alex')
  assert.equal(user.isAdmin, true)
  const cookies = res.headers.getSetCookie()
  assert.equal(cookies.length, 1)
  assert.match(cookies[0] as string, /^pupload_session=[A-Za-z0-9_-]{43}; HttpOnly; SameSite=Lax; Path=\/; Max-Age=2592000$/)
}))

test('the username works in another case', () => withAccount(async (app) => {
  const res = await signIn(app, { username: 'ALEX' })
  assert.equal(res.status, 201)
  assert.equal(((await res.json()) as { user: { username: string } }).user.username, 'alex')
}))

test('the sessions table holds the hash of the token, and not the token', () => withAccount(async (app) => {
  const res = await signIn(app)
  const token = sessionToken(res)
  const rows = sessionRows(app)
  assert.equal(rows.length, 1)
  const row = rows[0] as { token_hash: Uint8Array }
  assert.ok(Buffer.from(row.token_hash).equals(createHash('sha256').update(token).digest()))
  for (const value of Object.values(row)) assert.notEqual(value, token)
}))

test('a wrong password and an unknown username get the same 401', () => withAccount(async (app) => {
  const wrongPassword = await signIn(app, { password: 'not the passphrase' })
  const unknownUser = await signIn(app, { username: 'sam' })
  assert.equal(wrongPassword.status, 401)
  assert.equal(unknownUser.status, 401)
  assert.deepEqual(await wrongPassword.json(), noMatch)
  assert.deepEqual(await unknownUser.json(), noMatch)
  assert.equal(sessionRows(app).length, 0)
}))

test('an account with no password cannot sign in', () => withAccount(async (app) => {
  app.db.prepare(`INSERT INTO users (username, password_hash, created_at) VALUES ('sam', '', 0)`).run()
  for (const attempt of ['', password, 'sam']) {
    const res = await signIn(app, { username: 'sam', password: attempt })
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), noMatch)
  }
  assert.equal(sessionRows(app).length, 0)
}))

test('a missing field gets 400', () => withAccount(async (app) => {
  for (const field of ['username', 'password']) {
    const res = await signIn(app, { [field]: undefined })
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), { error: 'Send username and password, each as a string.' })
  }
}))

test('signing in twice makes two sessions', () => withAccount(async (app) => {
  const first = await signIn(app)
  const second = await signIn(app)
  assert.notEqual(first.headers.getSetCookie()[0], second.headers.getSetCookie()[0])
  assert.equal(sessionRows(app).length, 2)
}))
