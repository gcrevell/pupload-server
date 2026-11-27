import { strict as assert } from 'node:assert'
import { argon2, randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { promisify } from 'node:util'
import { hashPassword, verifyPassword } from '../server/accounts/passwords.ts'

test('a password verifies against its own hash', async () => {
  const hash = await hashPassword('correct horse battery staple')
  assert.match(hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/)
  assert.equal(await verifyPassword('correct horse battery staple', hash), true)
})

test('a wrong password does not verify', async () => {
  const hash = await hashPassword('correct horse battery staple')
  assert.equal(await verifyPassword('correct horse battery stapler', hash), false)
})

test('two hashes of one password differ, and both verify', async () => {
  const [one, two] = await Promise.all([hashPassword('hunter2hunter2'), hashPassword('hunter2hunter2')])
  assert.notEqual(one, two)
  assert.equal(await verifyPassword('hunter2hunter2', one), true)
  assert.equal(await verifyPassword('hunter2hunter2', two), true)
})

test('a hash made with other settings still verifies', async () => {
  const nonce = randomBytes(16)
  const hash = await promisify(argon2)('argon2id', { message: 'hunter2hunter2', nonce, parallelism: 1, tagLength: 32, memory: 8192, passes: 1 })
  const stored = `$argon2id$v=19$m=8192,t=1,p=1$${nonce.toString('base64').replace(/=+$/, '')}$${hash.toString('base64').replace(/=+$/, '')}`
  assert.equal(await verifyPassword('hunter2hunter2', stored), true)
  assert.equal(await verifyPassword('hunter3hunter3', stored), false)
})

test('a string that is not a hash does not verify, and does not throw', async () => {
  const salt = 'A'.repeat(22)
  const hash = 'A'.repeat(43)
  for (const stored of [
    '',
    'nonsense',
    `$argon2id$v=19$m=8192,t=1,p=1$AAAA$AAAA`,
    `$argon2id$v=19$m=99999999,t=1,p=1$${salt}$${hash}`,
    `$argon2id$v=19$m=8192,t=1,p=1$${salt}$${hash}=`,
  ]) {
    assert.equal(await verifyPassword('hunter2hunter2', stored), false)
  }
})

test('the same password typed in NFC and NFD forms verifies', async () => {
  const nfc = 'caf\u00e9 au lait'
  const nfd = 'cafe\u0301 au lait'
  assert.notEqual(nfc, nfd)
  assert.equal(await verifyPassword(nfd, await hashPassword(nfc)), true)
  assert.equal(await verifyPassword(nfc, await hashPassword(nfd)), true)
})
