import test from 'node:test'
import assert from 'node:assert/strict'

process.env.JWT_SECRET = 'j'.repeat(40)
process.env.HASH_PEPPER = 'p'.repeat(40)
process.env.DATA_ENCRYPTION_KEY = 'ab'.repeat(32)

const { signAdminToken, signVoterToken, verifyToken } = await import('../src/lib/auth.js')

test('a voter token can never be used as an admin token (and vice versa)', () => {
  const voter = signVoterToken({ id: 'v1' })
  const admin = signAdminToken({ id: 'a1' })
  assert.equal(verifyToken(voter, 'voter').sub, 'v1')
  assert.throws(() => verifyToken(voter, 'admin'))
  assert.throws(() => verifyToken(admin, 'voter'))
})
