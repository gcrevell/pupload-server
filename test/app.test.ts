import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { serverVersion } from '../server/version.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

let app: StartedApp
let base: string

before(async () => {
  app = await startApp({
    routes: [...v1Routes, { method: 'GET', path: '/api/test/ping', handle: () => ({ pong: true }) }],
  })
  base = app.base
})

after(async () => {
  await app.close()
})

test('GET / says hello world', async () => {
  const res = await fetch(`${base}/`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8')
  assert.equal(await res.text(), 'hello world\n')
})

test('an unknown path is a 404', async () => {
  const res = await fetch(`${base}/nope`)
  assert.equal(res.status, 404)
})

test('GET /api/v1/info returns the server version', async () => {
  const res = await fetch(`${base}/api/v1/info`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.deepEqual(await res.json(), { version: serverVersion() })
})

test('another method on /api/v1/info is a 405', async () => {
  const res = await fetch(`${base}/api/v1/info`, { method: 'POST' })
  assert.equal(res.status, 405)
  assert.equal(res.headers.get('allow'), 'GET')
})

test('a route passed to createApp answers', async () => {
  const res = await fetch(`${base}/api/test/ping`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { pong: true })
})
