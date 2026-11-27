import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { clientAddress } from '../server/api/client-address.ts'

const proxy = '192.0.2.10'
const trusted = [proxy]

test('a peer that is not trusted is the address, whatever the header says', () => {
  assert.equal(clientAddress('203.0.113.7', '198.51.100.4', trusted), '203.0.113.7')
  assert.equal(clientAddress('203.0.113.7', '198.51.100.4', []), '203.0.113.7')
  assert.equal(clientAddress('::1', undefined, trusted), '::1')
})

test('a trusted peer gives the address in the header', () => {
  assert.equal(clientAddress(proxy, '203.0.113.7', trusted), '203.0.113.7')
})

test('with two hops, the first address from the right that is not trusted is the client', () => {
  assert.equal(clientAddress(proxy, '198.51.100.99, 203.0.113.7', trusted), '203.0.113.7')
  assert.equal(clientAddress(proxy, '203.0.113.7, 192.0.2.11', ['192.0.2.10', '192.0.2.11']), '203.0.113.7')
  assert.equal(clientAddress(proxy, '198.51.100.99, 203.0.113.7, 192.0.2.11', ['192.0.2.10', '192.0.2.11']), '203.0.113.7')
})

test('::ffff: forms match in the peer, the header and the list', () => {
  assert.equal(clientAddress('::ffff:192.0.2.10', '::ffff:203.0.113.7', trusted), '203.0.113.7')
  assert.equal(clientAddress(proxy, '203.0.113.7, ::FFFF:192.0.2.10', trusted), '203.0.113.7')
  assert.equal(clientAddress('::ffff:203.0.113.7', undefined, trusted), '203.0.113.7')
  assert.equal(clientAddress('2001:DB8::1', undefined, []), '2001:db8::1')
  assert.equal(clientAddress('2001:db8::10', '2001:DB8::99', ['2001:db8::10']), '2001:db8::99')
})

test('an entry that is not an address gives the peer', () => {
  assert.equal(clientAddress(proxy, 'unknown', trusted), proxy)
  assert.equal(clientAddress(proxy, '203.0.113.7, 192.0.2', trusted), proxy)
  assert.equal(clientAddress(proxy, '203.0.113.7,, ', trusted), proxy)
})

test('a missing or empty header gives the peer', () => {
  assert.equal(clientAddress(proxy, undefined, trusted), proxy)
  assert.equal(clientAddress(proxy, '', trusted), proxy)
})

test('when every entry is trusted, the leftmost is the address', () => {
  assert.equal(clientAddress(proxy, '192.0.2.11, 192.0.2.10', ['192.0.2.10', '192.0.2.11']), '192.0.2.11')
  assert.equal(clientAddress(proxy, proxy, trusted), proxy)
})

test('a missing peer gives an empty address', () => {
  assert.equal(clientAddress(undefined, '203.0.113.7', trusted), '')
  assert.equal(clientAddress(undefined, undefined, []), '')
})
