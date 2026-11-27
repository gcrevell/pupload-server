import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import { handleRequest } from '../server/app.ts'

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
