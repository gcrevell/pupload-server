import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { EnvError, readEnv } from '../server/env.ts'

test('PORT defaults to 7875', () => {
  assert.equal(readEnv({}).port, 7875)
  assert.equal(readEnv({ PORT: '' }).port, 7875)
})

test('PORT is read from the environment', () => {
  assert.equal(readEnv({ PORT: '9000' }).port, 9000)
})

test('a PORT that is not a port number is refused', () => {
  for (const value of ['abc', '80.5', '-1', '0', '65536']) {
    assert.throws(() => readEnv({ PORT: value }), (err) => err instanceof EnvError && err.message.startsWith(`PORT is "${value}".`))
  }
})
