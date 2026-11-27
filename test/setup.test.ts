import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { newSetupCode, setupCodeMatches } from '../server/accounts/setup-code.ts'
import { verifyPassword } from '../server/accounts/passwords.ts'
import { v1Routes } from '../server/api/v1/routes.ts'
import { serverVersion } from '../server/version.ts'
import { startApp, testSetupCode, type StartedApp } from './helpers/start-app.ts'

const password = 'a long passphrase'

async function withApp(run: (app: StartedApp) => Promise<void>): Promise<void> {
  const app = await startApp({ routes: v1Routes })
  try {
    await run(app)
  } finally {
    await app.close()
  }
}

function setup(app: StartedApp, fields: Record<string, unknown>): Promise<Response> {
  return fetch(`${app.base}/api/v1/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: testSetupCode, username: 'alex', password, ...fields }),
  })
}

function userCount(app: StartedApp): number {
  return (app.db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n
}

async function refuses(app: StartedApp, fields: Record<string, unknown>, status: number, error: string): Promise<void> {
  const res = await setup(app, fields)
  assert.equal(res.status, status)
  assert.deepEqual(await res.json(), { error })
  assert.equal(userCount(app), 0)
}

test('a setup code is twelve characters from the alphabet, in groups of four', () => {
  for (let i = 0; i < 50; i++) assert.match(newSetupCode(), /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/)
  assert.notEqual(newSetupCode(), newSetupCode())
})

test('a setup code matches however it is typed, and nothing matches when there is no code', () => {
  assert.equal(setupCodeMatches('7KQ2-M9XD-PL4R', '7KQ2-M9XD-PL4R'), true)
  assert.equal(setupCodeMatches('7KQ2-M9XD-PL4R', '7kq2m9xdpl4r'), true)
  assert.equal(setupCodeMatches('7KQ2-M9XD-PL4R', '7kq2 m9xd pl4r'), true)
  assert.equal(setupCodeMatches('7KQ2-M9XD-PL4R', '7KQ2-M9XD-PL4S'), false)
  assert.equal(setupCodeMatches('7KQ2-M9XD-PL4R', '7KQ2-M9XD'), false)
  assert.equal(setupCodeMatches('7KQ2-M9XD-PL4R', ''), false)
  assert.equal(setupCodeMatches(undefined, '7KQ2-M9XD-PL4R'), false)
  assert.equal(setupCodeMatches(undefined, ''), false)
})

test('a wrong setup code gets 403 and creates nothing, and a lowercase one without hyphens works', () => withApp(async (app) => {
  await refuses(app, { code: '7KQ2-M9XD-PL4S' }, 403, "That setup code isn't right. Pupload prints the current one in its log when it starts.")
  assert.equal((await setup(app, { code: '7kq2m9xdpl4r' })).status, 201)
}))

test('a server with no setup code refuses every setup', async () => {
  const app = await startApp({ routes: v1Routes, setupCode: undefined })
  try {
    await refuses(app, {}, 403, "That setup code isn't right. Pupload prints the current one in its log when it starts.")
  } finally {
    await app.close()
  }
})

test('a username that breaks the rules gets 400', () => withApp(async (app) => {
  const message = 'A username is 1 to 64 letters, digits, dots, underscores or hyphens.'
  for (const username of ['', 'a'.repeat(65), 'a b', 'é']) await refuses(app, { username }, 400, message)
  assert.equal((await setup(app, { username: 'a'.repeat(64) })).status, 201)
}))

test('a password under 12 characters gets 400, and 12 emoji are enough', () => withApp(async (app) => {
  await refuses(app, { password: '12345678901' }, 400, 'A password needs at least 12 characters.')
  await refuses(app, { password: '😀'.repeat(11) }, 400, 'A password needs at least 12 characters.')
  assert.equal((await setup(app, { password: '😀'.repeat(12) })).status, 201)
}))

test('a missing field, or a number where a string goes, gets 400', () => withApp(async (app) => {
  const message = 'Send code, username and password, each as a string.'
  for (const field of ['code', 'username', 'password']) {
    await refuses(app, { [field]: undefined }, 400, message)
    await refuses(app, { [field]: 12345678901234 }, 400, message)
  }
}))

test('setup creates an admin, stores a hash that verifies, and info stops asking for setup', () => withApp(async (app) => {
  const before = Date.now()
  const res = await setup(app, {})
  assert.equal(res.status, 201)
  const { user } = await res.json() as { user: { id: number; username: string; isAdmin: boolean; createdAt: string } }
  assert.deepEqual(Object.keys(user), ['id', 'username', 'isAdmin', 'createdAt'])
  assert.equal(user.username, 'alex')
  assert.equal(user.isAdmin, true)
  const created = new Date(user.createdAt)
  assert.equal(created.toISOString(), user.createdAt)
  assert.ok(created.getTime() >= before && created.getTime() <= Date.now())

  const row = app.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as { password_hash: string }
  assert.equal(await verifyPassword(password, row.password_hash), true)
  assert.equal(await verifyPassword('another long passphrase', row.password_hash), false)

  const info = await fetch(`${app.base}/api/v1/info`)
  assert.deepEqual(await info.json(), { version: serverVersion(), setupNeeded: false })
}))

test('a second setup gets 409', () => withApp(async (app) => {
  assert.equal((await setup(app, {})).status, 201)
  const res = await setup(app, { username: 'sam' })
  assert.equal(res.status, 409)
  assert.deepEqual(await res.json(), { error: 'Pupload already has an account. Sign in instead.' })
  assert.equal(userCount(app), 1)
}))

test('two setups at once create one account', () => withApp(async (app) => {
  const responses = await Promise.all([setup(app, { username: 'alex' }), setup(app, { username: 'sam' })])
  assert.deepEqual(responses.map((res) => res.status).sort(), [201, 409])
  assert.equal(userCount(app), 1)
}))
