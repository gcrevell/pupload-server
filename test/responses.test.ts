import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { startApp, type StartedApp } from './helpers/start-app.ts'

let app: StartedApp

before(async () => {
  app = await startApp({
    routes: [
      { method: 'GET', path: '/api/test/created', handle: () => ({ status: 201, headers: { 'X-Test': 'yes' }, body: { ok: true } }) },
      { method: 'GET', path: '/api/test/empty', handle: () => ({ status: 204 }) },
    ],
  })
})

after(async () => {
  await app.close()
})

test('a handler sets the status, headers and body', async () => {
  const res = await fetch(`${app.base}/api/test/created`)
  assert.equal(res.status, 201)
  assert.equal(res.headers.get('x-test'), 'yes')
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.deepEqual(await res.json(), { ok: true })
})

test('a response with no body has no body and no Content-Type', async () => {
  const res = await fetch(`${app.base}/api/test/empty`)
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('content-type'), null)
  assert.equal(await res.text(), '')
})
