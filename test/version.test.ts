import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { serverVersion } from '../server/version.ts'

test('the version comes from PUPLOAD_VERSION', () => {
  assert.equal(serverVersion({ PUPLOAD_VERSION: '2026.11.3' }), '2026.11.3')
})

test('the version is dev when PUPLOAD_VERSION is unset or empty', () => {
  assert.equal(serverVersion({}), 'dev')
  assert.equal(serverVersion({ PUPLOAD_VERSION: '' }), 'dev')
})
