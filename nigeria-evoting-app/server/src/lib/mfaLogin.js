import { verifyTotp } from './totp.js'
import { isLocked, recordFailure, clearFailures } from './lockout.js'

// Second step of voter sign-in: check the authenticator-app code.
//  - A code can be used ONCE (replay blocked, race-safe via an atomic update).
//  - Wrong codes count toward the same 5-strikes lockout as wrong passwords.
// Returns { status: 'ok' | 'invalid' | 'locked' }.
export async function checkLoginMfa(prisma, voter, code, { decryptSecret, now = Date.now() }) {
  if (isLocked(voter)) return { status: 'locked' }
  if (!voter.mfaEnabled || !voter.mfaSecret) return { status: 'invalid' }

  const step = verifyTotp(decryptSecret(voter.mfaSecret), code, { lastStep: voter.mfaLastStep, now })
  if (step !== null) {
    const claim = await prisma.voter.updateMany({
      where: { id: voter.id, OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }] },
      data: { mfaLastStep: step },
    })
    if (claim.count === 1) {
      await clearFailures(prisma.voter, voter)
      return { status: 'ok' }
    }
  }
  const justLocked = await recordFailure(prisma.voter, voter)
  return { status: justLocked ? 'locked' : 'invalid' }
}
