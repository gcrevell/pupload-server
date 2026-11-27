import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import { handleRequest } from '../server/app.ts'
import { serverVersion } from '../server/version.ts'

let server: Server
let base: string

before(async () => {
  server = createServer(handleRequest)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(() => {
  server.close()
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
