import test from 'node:test'
import assert from 'node:assert/strict'

process.env.JWT_SECRET = 'j'.repeat(40)
process.env.HASH_PEPPER = 'p'.repeat(40)
process.env.DATA_ENCRYPTION_KEY = 'ab'.repeat(32)

const { hmac, encrypt, decrypt, safeEqual } = await import('../src/lib/crypto.js')

test('hmac is keyed, deterministic and purpose-separated', () => {
  assert.equal(hmac('123', 'nin'), hmac('123', 'nin'))
  assert.notEqual(hmac('123', 'nin'), hmac('123', 'pvc'))
})

test('AES-GCM round trip and tamper detection', () => {
  const enc = encrypt('JBSWY3DPEHPK3PXP')
  assert.equal(decrypt(enc), 'JBSWY3DPEHPK3PXP')
  const parts = enc.split('.')
  parts[2] = Buffer.from('tampered').toString('base64')
  assert.throws(() => decrypt(parts.join('.')))
})

test('safeEqual', () => {
  assert.equal(safeEqual('a', 'a'), true)
  assert.equal(safeEqual('a', 'b'), false)
})
