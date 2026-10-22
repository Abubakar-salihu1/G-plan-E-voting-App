import crypto from 'node:crypto'

// "Forgot password" for voters.
//  - Always answers the same whether or not the email is registered (no account guessing).
//  - The emailed 6-digit code lasts 15 minutes, allows 5 wrong tries, then is destroyed.
//  - Claiming a code is atomic, so it can be used once only.
//  - A successful reset ends every signed-in session (tokenVersion) and emails a notice.
//  - It changes ONLY the password: the voter still needs their passkey / authenticator at sign-in.

export const RESET_TTL_MS = 15 * 60 * 1000
export const RESET_RESEND_MS = 60 * 1000
export const RESET_MAX_ATTEMPTS = 5

export function createPasswordReset({ prisma, deliver, notify, hashCode, hashPassword, passwordProblem, now = () => Date.now() }) {
  const sameHash = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

  async function request(email) {
    const generic = { sent: true }
    const voter = await prisma.voter.findUnique({ where: { email } })
    if (!voter) return generic

    const t = now()
    const code = String(crypto.randomInt(100000, 1000000))
    const claim = await prisma.voter.updateMany({
      where: { id: voter.id, OR: [{ resetExpiresAt: null }, { resetExpiresAt: { lte: new Date(t + RESET_TTL_MS - RESET_RESEND_MS) } }] },
      data: { resetHash: hashCode(code, voter.id), resetExpiresAt: new Date(t + RESET_TTL_MS), resetAttempts: 0 },
    })
    if (claim.count === 0) return generic // one was just sent

    try {
      const delivery = await deliver('Reset', voter.email, code)
      return { ...generic, ...(delivery.devOnlyCode ? { devOnlyCode: delivery.devOnlyCode } : {}) }
    } catch (err) {
      await prisma.voter.update({ where: { id: voter.id }, data: { resetHash: null, resetExpiresAt: null } })
      console.error('[reset] could not send code:', err?.message || err)
      return generic // do not reveal that this email exists
    }
  }

  // Returns { status: 'ok' | 'invalid' | 'weak', message? }
  async function confirm(email, code, newPassword) {
    const problem = passwordProblem(newPassword)
    if (problem) return { status: 'weak', message: problem }

    const voter = await prisma.voter.findUnique({ where: { email } })
    const ok = voter?.resetHash && voter.resetExpiresAt && voter.resetExpiresAt.getTime() > now() && voter.resetAttempts < RESET_MAX_ATTEMPTS
    if (!ok) return { status: 'invalid' }

    if (!sameHash(hashCode(String(code ?? '').replace(/\D/g, ''), voter.id), voter.resetHash)) {
      await prisma.voter.update({ where: { id: voter.id }, data: { resetAttempts: { increment: 1 } } })
      return { status: 'invalid' }
    }

    // Claim the code (single use), then change the password.
    const claim = await prisma.voter.updateMany({
      where: { id: voter.id, resetHash: voter.resetHash },
      data: { resetHash: null, resetExpiresAt: null, resetAttempts: 0 },
    })
    if (claim.count !== 1) return { status: 'invalid' }

    await prisma.voter.update({
      where: { id: voter.id },
      data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null },
    })
    await notify(voter.email, 'Your NaijaVote password was changed', 'Your NaijaVote password was just changed and all signed-in sessions were ended. If this was not you, contact the commission immediately.')
    return { status: 'ok', voterId: voter.id }
  }

  return { request, confirm }
}
