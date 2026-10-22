import test from 'node:test'
import assert from 'node:assert/strict'
import { checkLoginMfa } from '../src/lib/mfaLogin.js'
import { generateSecret, hotp, base32Decode } from '../src/lib/totp.js'

function setup(extra = {}) {
  const secret = generateSecret()
  const row = { id: 'v1', mfaEnabled: true, mfaSecret: secret, mfaLastStep: null, failedLogins: 0, lockedUntil: null, ...extra }
  const prisma = { voter: {
    async updateMany({ where, data }) {
      const ok = row.mfaLastStep === null || row.mfaLastStep < where.OR[1].mfaLastStep.lt
      if (!ok) return { count: 0 }
      Object.assign(row, data); return { count: 1 }
    },
    async update({ data }) {
      if (data.failedLogins?.increment) row.failedLogins += data.failedLogins.increment
      else Object.assign(row, data)
      return row
    },
  } }
  const now = 1_700_000_000_000
  const step = Math.floor(now / 1000 / 30)
  const good = hotp(base32Decode(secret), step)
  const opts = { decryptSecret: (s) => s, now }
  return { prisma, row, good, opts }
}

test('correct code signs in once; the same code cannot be replayed', async () => {
  const { prisma, row, good, opts } = setup()
  assert.equal((await checkLoginMfa(prisma, { ...row }, good, opts)).status, 'ok')
  assert.equal((await checkLoginMfa(prisma, { ...row }, good, opts)).status, 'invalid')
})

test('wrong codes lock the account after 5 failures', async () => {
  const { prisma, row, opts } = setup()
  let last
  for (let i = 0; i < 5; i++) last = await checkLoginMfa(prisma, { ...row }, '000000', opts)
  assert.equal(last.status, 'locked')
  assert.ok(row.lockedUntil)
})

test('a locked account is refused even with the right code', async () => {
  const { prisma, row, good, opts } = setup({ lockedUntil: new Date(Date.now() + 60_000) })
  assert.equal((await checkLoginMfa(prisma, { ...row }, good, opts)).status, 'locked')
})

test('accounts without MFA cannot use the MFA step', async () => {
  const { prisma, row, good, opts } = setup({ mfaEnabled: false })
  assert.equal((await checkLoginMfa(prisma, { ...row }, good, opts)).status, 'invalid')
})
