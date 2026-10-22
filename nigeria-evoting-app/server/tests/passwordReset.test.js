import test from 'node:test'
import assert from 'node:assert/strict'
import { createPasswordReset } from '../src/lib/passwordReset.js'

function setup(extra = {}) {
  const row = { id: 'v1', email: 'a@b.c', passwordHash: 'old', tokenVersion: 0, failedLogins: 3, lockedUntil: new Date(), resetHash: null, resetExpiresAt: null, resetAttempts: 0, ...extra }
  const prisma = { voter: {
    async findUnique({ where }) { return where.email === row.email ? { ...row } : null },
    async updateMany({ where, data }) {
      const okSlot = where.OR ? where.OR.some((c) => (c.resetExpiresAt === null ? row.resetExpiresAt === null : row.resetExpiresAt && row.resetExpiresAt <= c.resetExpiresAt.lte)) : row.resetHash === where.resetHash
      if (!okSlot) return { count: 0 }
      Object.assign(row, data); return { count: 1 }
    },
    async update({ data }) {
      for (const [k, v] of Object.entries(data)) row[k] = v?.increment ? row[k] + v.increment : v
      return row
    },
  } }
  const sent = []; const notices = []
  const svc = createPasswordReset({
    prisma, deliver: async (kind, to, code) => { sent.push(code); return { emailed: true } },
    notify: async (...a) => notices.push(a), hashCode: (c, id) => 'h:' + c + id, hashPassword: async (p) => 'H(' + p + ')',
    passwordProblem: (p) => (p && p.length >= 10 ? null : 'too weak'),
  })
  return { row, svc, sent, notices }
}

test('unknown email gets the same reply and nothing is sent', async () => {
  const { svc, sent } = setup()
  assert.deepEqual(await svc.request('nobody@x.y'), { sent: true })
  assert.equal(sent.length, 0)
})

test('code resets the password once, ends sessions, unlocks and notifies', async () => {
  const { svc, sent, row, notices } = setup()
  await svc.request('a@b.c')
  assert.equal((await svc.confirm('a@b.c', sent[0], 'NewPassw0rd!')).status, 'ok')
  assert.equal(row.passwordHash, 'H(NewPassw0rd!)'); assert.equal(row.tokenVersion, 1)
  assert.equal(row.failedLogins, 0); assert.equal(row.lockedUntil, null); assert.equal(notices.length, 1)
  assert.equal((await svc.confirm('a@b.c', sent[0], 'NewPassw0rd!')).status, 'invalid') // single use
})

test('five wrong codes burn the reset', async () => {
  const { svc, sent } = setup()
  await svc.request('a@b.c')
  for (let i = 0; i < 5; i++) assert.equal((await svc.confirm('a@b.c', '000000', 'NewPassw0rd!')).status, 'invalid')
  assert.equal((await svc.confirm('a@b.c', sent[0], 'NewPassw0rd!')).status, 'invalid')
})

test('weak password is rejected before the code is touched', async () => {
  const { svc, sent } = setup()
  await svc.request('a@b.c')
  assert.equal((await svc.confirm('a@b.c', sent[0], 'short')).status, 'weak')
  assert.equal((await svc.confirm('a@b.c', sent[0], 'NewPassw0rd!')).status, 'ok')
})

test('requesting twice quickly sends only one email', async () => {
  const { svc, sent } = setup()
  await Promise.all([svc.request('a@b.c'), svc.request('a@b.c')])
  assert.equal(sent.length, 1)
})
