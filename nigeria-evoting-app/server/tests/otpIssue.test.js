import test from 'node:test'
import assert from 'node:assert/strict'
import { createOtpIssuer, OTP_MAX_SENDS, maskEmail } from '../src/lib/otpIssue.js'

function fakePrisma(initial = {}) {
  const row = { id: 'v1', email: 'abubakar@gmail.com', otpHash: null, otpExpiresAt: null, otpAttempts: 0, ...initial }
  return {
    row,
    voter: {
      async updateMany({ where, data }) {
        await Promise.resolve() // yield, like a real DB round-trip
        const ok = where.OR.some((c) => (c.otpExpiresAt === null ? row.otpExpiresAt === null : row.otpExpiresAt && row.otpExpiresAt <= c.otpExpiresAt.lte))
        if (!ok) return { count: 0 }
        Object.assign(row, data)
        return { count: 1 }
      },
      async update({ data }) { Object.assign(row, data); return row },
    },
  }
}

test('two simultaneous requests send exactly one email', async () => {
  const prisma = fakePrisma(); let sent = 0
  const issue = createOtpIssuer({ prisma, deliver: async () => { sent++; return { emailed: true } }, hash: (c) => c })
  const [a, b] = await Promise.all([issue({ ...prisma.row }), issue({ ...prisma.row })])
  assert.equal(sent, 1)
  assert.equal([a, b].filter((r) => r.sent).length, 1)
  assert.equal([a, b].filter((r) => r.cooldown).length, 1)
})

test('failed email rolls the claim back so retry works at once', async () => {
  const prisma = fakePrisma(); let fail = true
  const issue = createOtpIssuer({ prisma, deliver: async () => { if (fail) throw new Error('smtp down'); return { emailed: true } }, hash: (c) => c })
  await assert.rejects(() => issue({ ...prisma.row }), /smtp down/)
  assert.equal(prisma.row.otpHash, null)
  fail = false
  const r = await issue({ ...prisma.row })
  assert.equal(r.sent, true)
})

test('cooldown replies do not use up the send budget', async () => {
  const prisma = fakePrisma(); let sent = 0
  const issue = createOtpIssuer({ prisma, deliver: async () => { sent++; return { emailed: true } }, hash: (c) => c })
  await issue({ ...prisma.row })
  for (let i = 0; i < 20; i++) assert.equal((await issue({ ...prisma.row })).cooldown, true)
  assert.equal(sent, 1)
})

test('real sends are capped per window', async () => {
  let t = 1_000_000; const prisma = fakePrisma()
  const issue = createOtpIssuer({ prisma, deliver: async () => ({ emailed: true }), hash: (c) => c, now: () => t })
  for (let i = 0; i < OTP_MAX_SENDS; i++) { assert.equal((await issue({ ...prisma.row })).sent, true); t += 31_000 }
  await assert.rejects(() => issue({ ...prisma.row }), /Too many codes/)
})

test('maskEmail hides the middle', () => assert.equal(maskEmail('abubakar@gmail.com'), 'ab******@gmail.com'))
