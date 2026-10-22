import crypto from 'node:crypto'

// Backup (recovery) codes for voters who lose their phone.
//  - 8 one-time codes, ~50 bits each, shown to the voter ONCE; only keyed hashes are stored.
//  - Using a code signs the voter in but RESETS their MFA (passkeys / authenticator removed,
//    remaining codes destroyed), so they must set it up again on the new phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
const CODE_LEN = 10
const HOW_MANY = 8

export const normalizeCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const format = (raw) => `${raw.slice(0, 5)}-${raw.slice(5)}`

export function newRecoveryCode() {
  let raw = ''
  for (let i = 0; i < CODE_LEN; i++) raw += ALPHABET[crypto.randomInt(ALPHABET.length)]
  return raw
}

export function createRecoveryService({ prisma, hash }) {
  async function issue(voterId) {
    const raws = Array.from({ length: HOW_MANY }, newRecoveryCode)
    await prisma.recoveryCode.deleteMany({ where: { voterId } })
    await prisma.recoveryCode.createMany({ data: raws.map((r) => ({ voterId, codeHash: hash(r) })) })
    return raws.map(format)
  }

  // True only the first time a valid, unused code is presented (atomic).
  async function redeem(voterId, code) {
    const raw = normalizeCode(code)
    if (raw.length !== CODE_LEN) return false
    const claim = await prisma.recoveryCode.updateMany({
      where: { voterId, codeHash: hash(raw), usedAt: null },
      data: { usedAt: new Date() },
    })
    return claim.count === 1
  }

  // Removes every second factor so the voter must enrol again.
  async function resetMfa(voterId) {
    await prisma.$transaction([
      prisma.passkey.deleteMany({ where: { voterId } }),
      prisma.recoveryCode.deleteMany({ where: { voterId } }),
      prisma.voter.update({
        where: { id: voterId },
        data: { tokenVersion: { increment: 1 }, mfaEnabled: false, mfaSecret: null, mfaLastStep: null, webauthnChallenge: null, webauthnChallengeExp: null },
      }),
    ])
  }

  return { issue, redeem, resetMfa }
}
