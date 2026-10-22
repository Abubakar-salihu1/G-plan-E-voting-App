import crypto from 'node:crypto'
import { HttpError } from './http.js'

// Issues a one-time code for a voter and delivers it.
//
// Fixes over the first version:
//  1. The "send slot" is claimed with ONE atomic database update BEFORE the
//     email goes out, so two requests arriving together (React dev mode fires
//     the page effect twice) can never send two emails.
//  2. If the email fails to send, the claim is rolled back so the voter can
//     retry straight away instead of waiting out the cooldown.
//  3. Only real send attempts count toward the limit. Cooldown replies and
//     page reloads no longer burn the "too many codes" budget.

export const OTP_TTL_MS = 5 * 60 * 1000
export const OTP_RESEND_MS = 30 * 1000
export const OTP_WINDOW_MS = 10 * 60 * 1000
export const OTP_MAX_SENDS = 5

export function maskEmail(email = '') {
  const [name = '', domain = ''] = String(email).split('@')
  if (!domain) return ''
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`
}

export function createOtpIssuer({ prisma, deliver, hash, now = () => Date.now() }) {
  const sends = new Map() // voter id -> timestamps of recent real send attempts

  return async function issueOtp(voter) {
    const t = now()
    const recent = (sends.get(voter.id) || []).filter((x) => t - x < OTP_WINDOW_MS)
    if (recent.length >= OTP_MAX_SENDS) {
      const retryAfter = Math.ceil((recent[0] + OTP_WINDOW_MS - t) / 1000)
      throw Object.assign(new HttpError(429, 'Too many codes requested — wait a few minutes.'), { retryAfter })
    }

    const code = String(crypto.randomInt(100000, 1000000))
    const expiresAt = new Date(t + OTP_TTL_MS)

    // Atomic claim: only succeeds if no code was issued in the last OTP_RESEND_MS.
    const claim = await prisma.voter.updateMany({
      where: {
        id: voter.id,
        OR: [{ otpExpiresAt: null }, { otpExpiresAt: { lte: new Date(t + OTP_TTL_MS - OTP_RESEND_MS) } }],
      },
      data: { otpHash: hash(code, voter.id), otpExpiresAt: expiresAt, otpAttempts: 0 },
    })
    if (claim.count === 0) {
      const left = voter.otpExpiresAt ? Math.ceil((voter.otpExpiresAt.getTime() - (t + OTP_TTL_MS - OTP_RESEND_MS)) / 1000) : 30
      return { sent: false, cooldown: true, retryAfter: Math.min(OTP_RESEND_MS / 1000, Math.max(1, left)), to: maskEmail(voter.email) }
    }

    recent.push(t)
    sends.set(voter.id, recent)

    try {
      const delivery = await deliver('OTP', voter.email, code)
      return { sent: true, retryAfter: OTP_RESEND_MS / 1000, to: maskEmail(voter.email), ...delivery }
    } catch (err) {
      await prisma.voter.update({ where: { id: voter.id }, data: { otpHash: null, otpExpiresAt: null } })
      throw err
    }
  }
}
