import test from 'node:test'
import assert from 'node:assert/strict'
import { createPasskeyService } from '../src/lib/passkeys.js'

function setup() {
  const voter = { id: 'v1', email: 'a@b.c', failedLogins: 0, lockedUntil: null, webauthnChallenge: null, webauthnChallengeExp: null }
  const keys = []
  const prisma = {
    voter: {
      async update({ data }) {
        if (data.failedLogins?.increment) voter.failedLogins += data.failedLogins.increment
        else Object.assign(voter, data)
        return voter
      },
      async findUnique() { return { ...voter } },
      async updateMany({ where, data }) {
        if (voter.webauthnChallenge !== where.webauthnChallenge) return { count: 0 }
        Object.assign(voter, data); return { count: 1 }
      },
    },
    passkey: {
      async count() { return keys.length },
      async findMany() { return keys },
      async findFirst({ where }) { return keys.find((k) => k.credentialId === where.credentialId) ?? null },
      async create({ data }) { keys.push({ id: 'k' + keys.length, ...data }); return data },
      async update({ where, data }) { Object.assign(keys.find((k) => k.id === where.id), data) },
    },
  }
  let n = 0
  const state = { authOk: true }
  const lib = {
    generateRegistrationOptions: async () => ({ challenge: 'reg' + ++n }),
    generateAuthenticationOptions: async () => ({ challenge: 'auth' + ++n }),
    verifyRegistrationResponse: async () => ({ verified: true, registrationInfo: { credential: { id: 'cred1', publicKey: new Uint8Array([1, 2]), counter: 0 } } }),
    verifyAuthenticationResponse: async () => { if (!state.authOk) throw new Error('bad signature'); return { verified: true, authenticationInfo: { newCounter: 7 } } },
  }
  const svc = createPasskeyService({ prisma, rp: { id: 'x', name: 'N', origin: 'https://x' }, lib, onError: () => {} })
  return { voter, keys, svc, state }
}

test('registration stores the public key and the challenge is single-use', async () => {
  const { svc, keys, voter } = setup()
  await svc.registrationOptions(voter)
  assert.equal((await svc.registerPasskey(voter, {})).status, 'ok')
  assert.equal(keys.length, 1)
  assert.equal((await svc.registerPasskey(voter, {})).status, 'expired') // replay refused
})

test('sign-in works once per challenge and updates the counter', async () => {
  const { svc, keys, voter } = setup()
  await svc.registrationOptions(voter); await svc.registerPasskey(voter, {})
  await svc.authOptions(voter)
  assert.equal((await svc.checkLoginPasskey(voter, { id: 'cred1' })).status, 'ok')
  assert.equal(keys[0].counter, 7)
  assert.equal((await svc.checkLoginPasskey(voter, { id: 'cred1' })).status, 'expired')
})

test('unknown credential is refused and counts as a failure', async () => {
  const { svc, voter } = setup()
  await svc.registrationOptions(voter); await svc.registerPasskey(voter, {})
  await svc.authOptions(voter)
  assert.equal((await svc.checkLoginPasskey(voter, { id: 'nope' })).status, 'invalid')
  assert.equal(voter.failedLogins, 1)
})

test('five bad assertions lock the account', async () => {
  const { svc, voter, state } = setup()
  await svc.registrationOptions(voter); await svc.registerPasskey(voter, {})
  state.authOk = false
  let last
  for (let i = 0; i < 5; i++) { await svc.authOptions(voter); last = await svc.checkLoginPasskey(voter, { id: 'cred1' }) }
  assert.equal(last.status, 'locked')
  assert.equal((await svc.checkLoginPasskey(voter, { id: 'cred1' })).status, 'locked')
})

test('an expired challenge is refused without counting a failure', async () => {
  const { svc, voter } = setup()
  voter.webauthnChallenge = 'old'; voter.webauthnChallengeExp = new Date(Date.now() - 1000)
  assert.equal((await svc.checkLoginPasskey(voter, { id: 'cred1' })).status, 'expired')
  assert.equal(voter.failedLogins, 0)
})
