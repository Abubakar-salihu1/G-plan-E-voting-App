import test from 'node:test'
import assert from 'node:assert/strict'
import { createRecoveryService, normalizeCode, newRecoveryCode } from '../src/lib/recovery.js'

function setup() {
  const codes = []; const voter = { id: 'v1', mfaEnabled: true, mfaSecret: 's', mfaLastStep: 4 }; const passkeys = [{ id: 'p' }]
  const prisma = {
    recoveryCode: {
      async deleteMany() { codes.length = 0 },
      async createMany({ data }) { codes.push(...data.map((d) => ({ ...d, usedAt: null }))) },
      async updateMany({ where, data }) {
        const c = codes.find((x) => x.voterId === where.voterId && x.codeHash === where.codeHash && x.usedAt === null)
        if (!c) return { count: 0 }; Object.assign(c, data); return { count: 1 }
      },
    },
    passkey: { async deleteMany() { passkeys.length = 0 } },
    voter: { async update({ data }) { Object.assign(voter, data) } },
    async $transaction(ops) { return Promise.all(ops) },
  }
  return { codes, voter, passkeys, svc: createRecoveryService({ prisma, hash: (c) => 'h:' + c }) }
}

test('issues 8 unique codes and stores only hashes', async () => {
  const { svc, codes } = setup()
  const list = await svc.issue('v1')
  assert.equal(list.length, 8); assert.equal(new Set(list).size, 8)
  assert.match(list[0], /^[A-Z2-9]{5}-[A-Z2-9]{5}$/)
  assert.ok(codes.every((c) => !list.includes(c.codeHash)))
})

test('a code works once, in any case or spacing, and never again', async () => {
  const { svc } = setup()
  const [first] = await svc.issue('v1')
  assert.equal(await svc.redeem('v1', first.toLowerCase().replace('-', ' ')), true)
  assert.equal(await svc.redeem('v1', first), false)
})

test('wrong, short or another voter\'s code is refused', async () => {
  const { svc } = setup()
  const [first] = await svc.issue('v1')
  assert.equal(await svc.redeem('v1', 'AAAAA-AAAAA'), false)
  assert.equal(await svc.redeem('v1', 'ABC'), false)
  assert.equal(await svc.redeem('v2', first), false)
})

test('reset removes passkeys, codes and the authenticator', async () => {
  const { svc, voter, passkeys, codes } = setup()
  await svc.issue('v1'); await svc.resetMfa('v1')
  assert.equal(voter.mfaEnabled, false); assert.equal(voter.mfaSecret, null)
  assert.equal(passkeys.length, 0); assert.equal(codes.length, 0)
})

test('helpers', () => { assert.equal(normalizeCode(' ab-cd '), 'ABCD'); assert.equal(newRecoveryCode().length, 10) })
