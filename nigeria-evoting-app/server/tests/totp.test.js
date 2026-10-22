import test from 'node:test'
import assert from 'node:assert/strict'
import { base32Encode, base32Decode, hotp, verifyTotp, generateSecret } from '../src/lib/totp.js'

// RFC 6238 Appendix B test vector (SHA-1, secret "12345678901234567890"), 6 digits.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))

test('base32 round-trips', () => {
  const buf = Buffer.from('hello world, naijavote')
  assert.deepEqual(base32Decode(base32Encode(buf)), buf)
})

test('HOTP matches RFC 4226/6238 vectors', () => {
  const key = Buffer.from('12345678901234567890')
  assert.equal(hotp(key, 0), '755224')
  assert.equal(hotp(key, 1), '287082')
  assert.equal(hotp(key, 1 + 0), '287082')
  assert.equal(hotp(key, Math.floor(59 / 30)), '287082') // T=59s -> step 1 (RFC: 94287082)
})

test('verifyTotp accepts current code, rejects wrong and replayed codes', () => {
  const secret = generateSecret()
  const now = 1_700_000_000_000
  const step = Math.floor(now / 1000 / 30)
  const code = hotp(base32Decode(secret), step)
  assert.equal(verifyTotp(secret, code, { now }), step)
  assert.equal(verifyTotp(secret, '000000', { now }) === step, false)
  assert.equal(verifyTotp(secret, code, { now, lastStep: step }), null) // replay blocked
  assert.equal(verifyTotp(secret, 'abcdef', { now }), null)
})
