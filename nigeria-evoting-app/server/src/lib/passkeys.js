import { isLocked, recordFailure, clearFailures } from './lockout.js'

// Passkey (WebAuthn) support: the voter proves who they are with fingerprint /
// face / screen-lock on their own phone. The phone keeps the private key; we
// store only the public key, so a database leak can't be used to sign in.
//
//  - Each ceremony uses a random one-time challenge that expires in 5 minutes
//    and can be consumed ONCE (atomic update) — a captured response can't be replayed.
//  - User verification is REQUIRED, so the phone must check fingerprint/face/PIN.
//  - The signature counter is tracked to detect cloned authenticators.
//  - Wrong attempts count toward the same lockout as wrong passwords.

const CHALLENGE_TTL_MS = 5 * 60 * 1000
const parseTransports = (t) => (t ? t.split(',').filter(Boolean) : undefined)

export function createPasskeyService({ prisma, rp, lib, now = () => Date.now(), onError = (e) => console.error('[passkey]', e?.message || e) }) {
  const getLib = async () => lib ?? (await import('@simplewebauthn/server'))

  async function saveChallenge(voterId, challenge) {
    await prisma.voter.update({
      where: { id: voterId },
      data: { webauthnChallenge: challenge, webauthnChallengeExp: new Date(now() + CHALLENGE_TTL_MS) },
    })
  }

  // Reads the stored challenge and deletes it in one atomic step (single use).
  async function takeChallenge(voterId) {
    const v = await prisma.voter.findUnique({
      where: { id: voterId },
      select: { webauthnChallenge: true, webauthnChallengeExp: true },
    })
    if (!v?.webauthnChallenge || !v.webauthnChallengeExp || v.webauthnChallengeExp.getTime() < now()) return null
    const claim = await prisma.voter.updateMany({
      where: { id: voterId, webauthnChallenge: v.webauthnChallenge },
      data: { webauthnChallenge: null, webauthnChallengeExp: null },
    })
    return claim.count === 1 ? v.webauthnChallenge : null
  }

  const hasPasskey = async (voterId) => (await prisma.passkey.count({ where: { voterId } })) > 0

  async function registrationOptions(voter) {
    const { generateRegistrationOptions } = await getLib()
    const existing = await prisma.passkey.findMany({ where: { voterId: voter.id } })
    const options = await generateRegistrationOptions({
      rpName: rp.name,
      rpID: rp.id,
      userName: voter.email,
      userDisplayName: voter.email,
      userID: new TextEncoder().encode(voter.id),
      attestationType: 'none',
      excludeCredentials: existing.map((p) => ({ id: p.credentialId, transports: parseTransports(p.transports) })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
    })
    await saveChallenge(voter.id, options.challenge)
    return options
  }

  async function registerPasskey(voter, response) {
    const expectedChallenge = await takeChallenge(voter.id)
    if (!expectedChallenge) return { status: 'expired' }
    const { verifyRegistrationResponse } = await getLib()
    try {
      const result = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.id,
        requireUserVerification: true,
      })
      if (!result.verified || !result.registrationInfo) return { status: 'invalid' }
      const { credential } = result.registrationInfo
      await prisma.passkey.create({
        data: {
          voterId: voter.id,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter ?? 0,
          transports: (credential.transports ?? response?.response?.transports ?? []).join(','),
        },
      })
      return { status: 'ok' }
    } catch (err) {
      onError(err)
      return { status: 'invalid', detail: err?.message }
    }
  }

  async function authOptions(voter) {
    const { generateAuthenticationOptions } = await getLib()
    const passkeys = await prisma.passkey.findMany({ where: { voterId: voter.id } })
    const options = await generateAuthenticationOptions({
      rpID: rp.id,
      userVerification: 'required',
      allowCredentials: passkeys.map((p) => ({ id: p.credentialId, transports: parseTransports(p.transports) })),
    })
    await saveChallenge(voter.id, options.challenge)
    return options
  }

  // Verifies a sign-in assertion. Does NOT touch the failure counter (callers decide).
  async function verifyAssertion(voter, response) {
    const expectedChallenge = await takeChallenge(voter.id)
    if (!expectedChallenge) return { status: 'expired' }
    if (!response || typeof response.id !== 'string') return { status: 'invalid' }
    const pk = await prisma.passkey.findFirst({ where: { voterId: voter.id, credentialId: response.id } })
    if (!pk) return { status: 'invalid' }
    const { verifyAuthenticationResponse } = await getLib()
    try {
      const result = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.id,
        credential: {
          id: pk.credentialId,
          publicKey: new Uint8Array(pk.publicKey),
          counter: pk.counter,
          transports: parseTransports(pk.transports),
        },
        requireUserVerification: true,
      })
      if (!result.verified) return { status: 'invalid' }
      await prisma.passkey.update({ where: { id: pk.id }, data: { counter: result.authenticationInfo.newCounter } })
      return { status: 'ok' }
    } catch (err) {
      onError(err)
      return { status: 'invalid', detail: err?.message }
    }
  }

  // Sign-in step 2: like verifyAssertion, plus lockout handling.
  async function checkLoginPasskey(voter, response) {
    if (isLocked(voter)) return { status: 'locked' }
    const r = await verifyAssertion(voter, response)
    if (r.status === 'ok') {
      await clearFailures(prisma.voter, voter)
      return r
    }
    if (r.status === 'expired') return r
    const justLocked = await recordFailure(prisma.voter, voter)
    return { status: justLocked ? 'locked' : 'invalid', detail: r.detail }
  }

  return { hasPasskey, registrationOptions, registerPasskey, authOptions, verifyAssertion, checkLoginPasskey }
}
