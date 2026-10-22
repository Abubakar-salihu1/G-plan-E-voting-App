import { Router } from 'express'
import crypto from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import {
  hashPassword,
  verifyPassword,
  signVoterToken,
  signPurposeToken,
  verifyToken,
  DUMMY_HASH,
} from '../lib/auth.js'
import { appendAuditLog } from '../lib/auditLog.js'
import { hmac, safeEqual, encrypt, decrypt } from '../lib/crypto.js'
import { generateSecret, verifyTotp, otpauthUrl } from '../lib/totp.js'
import { isLocked, recordFailure, clearFailures } from '../lib/lockout.js'
import { rateLimit } from '../lib/rateLimit.js'
import { HttpError, wrap } from '../lib/http.js'
import { isEmail, normEmail, passwordProblem } from '../lib/validate.js'
import { faceProvider, parseImageDataUrl } from '../lib/faceProvider.js'
import { deliverCode, sendNotice } from '../lib/notify.js'
import { createPasswordReset } from '../lib/passwordReset.js'
import { createOtpIssuer } from '../lib/otpIssue.js'
import { checkLoginMfa } from '../lib/mfaLogin.js'
import { config } from '../lib/config.js'
import { createPasskeyService } from '../lib/passkeys.js'
import { createRecoveryService } from '../lib/recovery.js'
import { requireVoterAuth } from '../middleware/requireVoterAuth.js'

const router = Router()

const byIpAndEmail = (req) => `${req.ip}:${normEmail(req.body?.email)}`
const byVoter = (req) => req.voter?.id ?? req.ip

const signupLimiter = rateLimit({ windowMs: 60 * 60_000, max: 10, message: 'Too many sign-ups from this network. Try later.' })
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, key: byIpAndEmail })
const loginMfaLimiter = rateLimit({ windowMs: 15 * 60_000, max: 15 })
const sensitiveLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, key: byVoter })
const voteLoginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 8, key: byVoter })

const passwordReset = createPasswordReset({
  prisma,
  deliver: deliverCode,
  notify: sendNotice,
  hashCode: (code, id) => hmac(code, `reset:${id}`),
  hashPassword,
  passwordProblem,
})
const resetLimiter = rateLimit({ windowMs: 15 * 60_000, max: 6, key: byIpAndEmail })

const publicVoter = (v) => ({
  id: v.id,
  email: v.email,
  verified: v.verified,
  mfaEnabled: v.mfaEnabled,
  otpVerified: v.otpVerified,
  hasNin: !!v.ninHash,
  hasPvc: !!v.pvcHash,
  hasFace: !!v.faceTemplateHash,
})

// Once a voter is verified their identity data is frozen — otherwise someone
// could swap their NIN/PVC/face after approval.
function assertNotVerified(voter) {
  if (voter.verified) throw new HttpError(409, 'Your verification is already complete and cannot be changed.')
}

router.get('/me', requireVoterAuth, wrap(async (req, res) => {
  const v = req.voterRecord
  res.json({
    voter: {
      ...publicVoter(v),
      mfaMethod: !v.mfaEnabled ? null : (await passkeys.hasPasskey(v.id)) ? 'passkey' : 'totp',
      hasNin: !!v.ninHash,
      hasPvc: !!v.pvcHash,
      hasFace: !!v.faceTemplateHash,
    },
  })
}))

router.post('/signup', signupLimiter, wrap(async (req, res) => {
  const email = normEmail(req.body?.email)
  const { password } = req.body ?? {}
  if (!isEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' })
  const pwProblem = passwordProblem(password)
  if (pwProblem) return res.status(400).json({ message: pwProblem })

  if (await prisma.voter.findUnique({ where: { email } })) {
    return res.status(409).json({ message: 'An account with this email already exists.' })
  }

  const voter = await prisma.voter.create({ data: { email, passwordHash: await hashPassword(password) } })
  await appendAuditLog('system', `Voter account created (${voter.id.slice(0, 8)})`)
  res.status(201).json({ token: signVoterToken(voter), voter: publicVoter(voter) })
}))

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const email = normEmail(req.body?.email)
  const { password } = req.body ?? {}
  if (!email || typeof password !== 'string') {
    return res.status(400).json({ message: 'email and password are required.' })
  }

  const voter = await prisma.voter.findUnique({ where: { email } })
  // Always run a bcrypt compare so response time doesn't reveal whether the account exists.
  const ok = await verifyPassword(password, voter?.passwordHash ?? DUMMY_HASH)

  if (voter && isLocked(voter)) {
    return res.status(429).json({ message: 'Too many failed attempts — account temporarily locked. Try again later.' })
  }
  if (!voter || !ok) {
    if (voter && (await recordFailure(prisma.voter, voter))) {
      await appendAuditLog('system', `Voter account locked after repeated failed sign-ins (${voter.id.slice(0, 8)})`)
    }
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  // Password correct. If MFA is on, NO session is issued yet — only a 5-minute
  // single-purpose token that can do nothing except submit the authenticator code.
  if (voter.mfaEnabled) {
    const method = (await passkeys.hasPasskey(voter.id)) ? 'passkey' : 'totp'
    return res.json({ mfaRequired: true, method, mfaToken: signPurposeToken(voter.id, 'login-mfa', '5m') })
  }

  await clearFailures(prisma.voter, voter)
  await appendAuditLog('system', `Voter signed in without MFA (${voter.id.slice(0, 8)})`)
  res.json({ token: signVoterToken(voter), voter: publicVoter(voter) })
}))

// ── Forgot password (emailed code → new password). Sign-in still needs the second factor. ──
router.post('/password/forgot', resetLimiter, wrap(async (req, res) => {
  const email = normEmail(req.body?.email)
  if (!isEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' })
  const result = await passwordReset.request(email)
  res.json({ message: 'If that email is registered, a reset code has been sent.', ...(result.devOnlyCode ? { devOnlyCode: result.devOnlyCode } : {}) })
}))

router.post('/password/reset', resetLimiter, wrap(async (req, res) => {
  const email = normEmail(req.body?.email)
  const result = await passwordReset.confirm(email, req.body?.code, req.body?.newPassword)
  if (result.status === 'weak') return res.status(400).json({ message: result.message })
  if (result.status !== 'ok') return res.status(400).json({ message: 'That code is wrong or has expired. Request a new one.' })
  await appendAuditLog('system', `Voter password reset (${result.voterId.slice(0, 8)})`)
  res.json({ message: 'Password changed. Sign in with your new password.' })
}))

// Ends THIS voter's sessions everywhere (the old token stops working immediately).
router.post('/logout', requireVoterAuth, wrap(async (req, res) => {
  await prisma.voter.update({ where: { id: req.voter.id }, data: { tokenVersion: { increment: 1 } } })
  res.json({ message: 'Signed out.' })
}))

// Resolves the voter from the 5-minute single-purpose token issued after a correct password.
async function voterFromMfaToken(req, res) {
  const expired = () => res.status(401).json({ message: 'Your sign-in expired — enter your password again.', restart: true })
  let payload
  try {
    payload = verifyToken(String(req.body?.mfaToken ?? ''), 'login-mfa')
  } catch {
    expired()
    return null
  }
  const voter = await prisma.voter.findUnique({ where: { id: payload.sub } })
  if (!voter) {
    expired()
    return null
  }
  return voter
}

const lockedReply = (res) =>
  res.status(429).json({ message: 'Too many failed attempts — account temporarily locked. Try again later.', restart: true })

// Fresh one-time challenge for the fingerprint / face prompt.
router.post('/login/passkey-options', loginMfaLimiter, wrap(async (req, res) => {
  const voter = await voterFromMfaToken(req, res)
  if (!voter) return
  if (isLocked(voter)) return lockedReply(res)
  if (!(await passkeys.hasPasskey(voter.id))) return res.status(400).json({ message: 'No passkey on this account.' })
  res.json(await passkeys.authOptions(voter))
}))

router.post('/login/mfa', loginMfaLimiter, wrap(async (req, res) => {
  const voter = await voterFromMfaToken(req, res)
  if (!voter) return

  const usesPasskey = await passkeys.hasPasskey(voter.id)
  const result = usesPasskey
    ? await passkeys.checkLoginPasskey(voter, req.body?.assertion)
    : await checkLoginMfa(prisma, voter, req.body?.code, { decryptSecret: decrypt })

  if (result.status === 'locked') {
    await appendAuditLog('system', `Voter account locked after repeated failed sign-ins (${voter.id.slice(0, 8)})`)
    return lockedReply(res)
  }
  if (result.status === 'expired') {
    return res.status(401).json({ message: 'That took too long — tap the button and try again.' })
  }
  if (result.status !== 'ok') {
    return res.status(401).json({
      message: usesPasskey
        ? 'Fingerprint / face check did not match. Try again.'
        : 'That code is not correct, or was already used. Wait for a new code and try again.',
      ...(config.isProd ? {} : { detail: result.detail }),
    })
  }

  await appendAuditLog('system', `Voter signed in with ${usesPasskey ? 'passkey' : 'MFA'} (${voter.id.slice(0, 8)})`)
  res.json({ token: signVoterToken(voter), voter: publicVoter(voter) })
}))

// Lost phone: password + ONE backup code signs the voter in, then resets their MFA
// so they must set it up again on the new phone. Wrong codes count toward the lockout.
router.post('/login/recovery', loginMfaLimiter, wrap(async (req, res) => {
  const voter = await voterFromMfaToken(req, res)
  if (!voter) return
  if (isLocked(voter)) return lockedReply(res)

  if (!(await recovery.redeem(voter.id, req.body?.recoveryCode))) {
    if (await recordFailure(prisma.voter, voter)) {
      await appendAuditLog('system', `Voter account locked after repeated failed sign-ins (${voter.id.slice(0, 8)})`)
      return lockedReply(res)
    }
    return res.status(401).json({ message: 'That backup code is not valid or was already used.' })
  }
  await clearFailures(prisma.voter, voter)
  await recovery.resetMfa(voter.id)
  await appendAuditLog('system', `Voter MFA reset using a backup code (${voter.id.slice(0, 8)})`)
  sendNotice(voter.email, 'Your NaijaVote security was reset', 'A backup code was just used to sign in to your NaijaVote account, and your passkey / authenticator was removed. If this was not you, contact the commission immediately.')
  const fresh = { ...voter, mfaEnabled: false, tokenVersion: voter.tokenVersion + 1 }
  res.json({ token: signVoterToken(fresh), voter: publicVoter(fresh) })
}))

// Replace the voter's backup codes (old ones stop working). Needs a normal signed-in session.
router.post('/recovery-codes', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  if (!req.voterRecord.mfaEnabled) return res.status(409).json({ message: 'Set up MFA first.' })
  await appendAuditLog('system', `Voter backup codes regenerated (${req.voterRecord.id.slice(0, 8)})`)
  res.json({ recoveryCodes: await recovery.issue(req.voterRecord.id) })
}))

// ── Passkey enrolment (fingerprint / face unlock as the voter's second factor) ──
router.post('/passkey/register/options', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  if (voter.mfaEnabled) return res.status(409).json({ message: 'MFA is already set up on this account.' })
  res.json(await passkeys.registrationOptions(voter))
}))

router.post('/passkey/register/verify', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  if (voter.mfaEnabled) return res.status(409).json({ message: 'MFA is already set up on this account.' })
  const result = await passkeys.registerPasskey(voter, req.body?.response)
  if (result.status === 'expired') return res.status(400).json({ message: 'That took too long — tap the button and try again.' })
  if (result.status !== 'ok') {
    return res.status(400).json({
      message: 'Could not register this device. Open the site from the same address you signed up on and try again.',
      ...(config.isProd ? {} : { detail: result.detail }),
    })
  }
  await prisma.voter.update({ where: { id: voter.id }, data: { mfaEnabled: true } })
  await appendAuditLog('system', `Voter passkey registered (${voter.id.slice(0, 8)})`)
  sendNotice(voter.email, 'A passkey was added to your NaijaVote account', 'A fingerprint / face passkey was just added to your NaijaVote account. If this was not you, contact the commission immediately.')
  res.json({ message: 'Passkey registered.', recoveryCodes: await recovery.issue(voter.id) })
}))

// ── OTP ─────────────────────────────────────────────────────────────────────
const passkeys = createPasskeyService({ prisma, rp: config.webauthn })
const recovery = createRecoveryService({ prisma, hash: (code) => hmac(code, 'recovery') })
const OTP_MAX_ATTEMPTS = 5
const issueOtp = createOtpIssuer({ prisma, deliver: deliverCode, hash: (code, id) => hmac(code, `otp:${id}`) })

router.post('/otp/request', requireVoterAuth, wrap(async (req, res) => {
  try {
    res.json(await issueOtp(req.voterRecord))
  } catch (err) {
    if (err.retryAfter) res.set('Retry-After', String(err.retryAfter))
    throw err
  }
}))

router.post('/otp/verify', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  const code = String(req.body?.code ?? '')

  if (!voter.otpHash || !voter.otpExpiresAt) return res.status(400).json({ message: 'Request a code first.' })
  if (voter.otpExpiresAt < new Date()) {
    await prisma.voter.update({ where: { id: voter.id }, data: { otpHash: null, otpExpiresAt: null } })
    return res.status(410).json({ message: 'This code has expired — request a new one.' })
  }
  if (voter.otpAttempts >= OTP_MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Too many wrong attempts — request a new code.' })
  }
  if (!/^\d{6}$/.test(code) || !safeEqual(hmac(code, `otp:${voter.id}`), voter.otpHash)) {
    await prisma.voter.update({ where: { id: voter.id }, data: { otpAttempts: { increment: 1 } } })
    return res.status(401).json({ message: 'Incorrect code.' })
  }

  await prisma.voter.update({
    where: { id: voter.id },
    data: { otpVerified: true, otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
  })
  res.json({ message: 'OTP verified.' })
}))

// ── TOTP MFA (required to finish verification; asked at every sign-in and at vote-login) ─────
router.post('/mfa/setup', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  if (voter.mfaEnabled) return res.status(409).json({ message: 'MFA is already enabled.' })
  const secret = generateSecret()
  await prisma.voter.update({ where: { id: voter.id }, data: { mfaSecret: encrypt(secret) } })
  res.json({ secret, otpauthUrl: otpauthUrl(secret, voter.email) })
}))

router.post('/mfa/confirm', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  if (voter.mfaEnabled) return res.status(409).json({ message: 'MFA is already enabled.' })
  if (!voter.mfaSecret) return res.status(400).json({ message: 'Start MFA setup first.' })
  const step = verifyTotp(decrypt(voter.mfaSecret), req.body?.code)
  if (step === null) return res.status(401).json({ message: 'That code is not correct — check your authenticator app.' })
  await prisma.voter.update({ where: { id: voter.id }, data: { mfaEnabled: true, mfaLastStep: step } })
  await appendAuditLog('system', `Voter MFA enabled (${voter.id.slice(0, 8)})`)
  res.json({ message: 'MFA enabled.', recoveryCodes: await recovery.issue(voter.id) })
}))

// ── Identity verification ───────────────────────────────────────────────────
// No live NIMC/INEC API exists to call here, so any well-formed NIN / PVC is
// accepted. What IS real: values are stored only as keyed HMACs, uniqueness is
// enforced by the database (race-safe), and verified accounts are frozen.
router.post('/verify-nin', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  assertNotVerified(req.voterRecord)
  const nin = String(req.body?.nin ?? '')
  if (!/^\d{11}$/.test(nin)) return res.status(400).json({ message: 'Enter a valid 11-digit NIN.' })

  const ninHash = hmac(nin, 'nin')
  const dup = await prisma.voter.findFirst({ where: { ninHash, id: { not: req.voter.id } } })
  if (dup) return res.status(409).json({ message: 'This NIN is already linked to another account.' })

  await prisma.voter.update({ where: { id: req.voter.id }, data: { ninHash } })
  await appendAuditLog('system', `NIN submitted (${req.voter.id.slice(0, 8)})`)
  res.json({ message: 'NIN verified.' })
}))

const normPvc = (s) => String(s ?? '').replace(/\s+/g, '').toUpperCase()

router.post('/verify-voter-card', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  assertNotVerified(req.voterRecord)
  const pvc = normPvc(req.body?.pvc)
  if (!/^[A-Z0-9]{10,25}$/.test(pvc)) return res.status(400).json({ message: 'Enter a valid voter card number.' })

  const pvcHash = hmac(pvc, 'pvc')
  const dup = await prisma.voter.findFirst({ where: { pvcHash, id: { not: req.voter.id } } })
  if (dup) return res.status(409).json({ message: 'This voter card is already linked to another account.' })

  await prisma.voter.update({ where: { id: req.voter.id }, data: { pvcHash } })
  await appendAuditLog('system', `Voter card submitted (${req.voter.id.slice(0, 8)})`)
  res.json({ message: 'Voter card verified.' })
}))

router.post('/verify-face', requireVoterAuth, sensitiveLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  assertNotVerified(voter)
  if (!voter.otpVerified || !voter.ninHash || !voter.pvcHash || !voter.mfaEnabled) {
    return res.status(409).json({ message: 'Complete OTP, authenticator (MFA), NIN and voter card steps first.' })
  }

  const image = parseImageDataUrl(req.body?.image)
  const { templateHash } = await faceProvider().enroll({ image })
  const dup = await prisma.voter.findFirst({ where: { faceTemplateHash: templateHash, id: { not: voter.id } } })
  if (dup) return res.status(409).json({ message: 'This face is already linked to another account.' })

  const verified = !config.requireAdminApproval
  await prisma.voter.update({ where: { id: voter.id }, data: { faceTemplateHash: templateHash, verified } })
  await appendAuditLog(
    'system',
    verified
      ? `Voter fully verified (${voter.id.slice(0, 8)})`
      : `Voter submitted for admin approval (${voter.id.slice(0, 8)})`,
  )
  res.json({ message: verified ? 'Verification complete.' : 'Submitted — awaiting administrator approval.', verified })
}))

// ── Vote-time re-check ──────────────────────────────────────────────────────
// Re-enter PVC + NIN (and authenticator code if MFA is on). Returns a 10-minute
// proof that /api/ballots/token requires together with a fresh face capture.
router.post('/vote-login/passkey-options', requireVoterAuth, voteLoginLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  if (isLocked(voter)) return res.status(429).json({ message: 'Too many failed attempts — locked for a while.' })
  if (!(await passkeys.hasPasskey(voter.id))) return res.status(400).json({ message: 'No passkey on this account.' })
  res.json(await passkeys.authOptions(voter))
}))

router.post('/vote-login', requireVoterAuth, voteLoginLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  if (isLocked(voter)) return res.status(429).json({ message: 'Too many failed attempts — locked for a while.' })
  if (!voter.verified) return res.status(403).json({ message: 'Your account is not fully verified yet.' })
  if (!voter.mfaEnabled) return res.status(403).json({ message: 'Set up your passkey or authenticator before voting.' })

  const pvc = normPvc(req.body?.pvc)
  const nin = String(req.body?.nin ?? '')
  const idsOk =
    voter.pvcHash && voter.ninHash &&
    safeEqual(hmac(pvc, 'pvc'), voter.pvcHash) &&
    safeEqual(hmac(nin, 'nin'), voter.ninHash)

  let mfaStep = null
  let mfaOk = true
  if (voter.mfaEnabled) {
    if (await passkeys.hasPasskey(voter.id)) {
      mfaOk = (await passkeys.verifyAssertion(voter, req.body?.assertion)).status === 'ok'
    } else {
      mfaStep = verifyTotp(decrypt(voter.mfaSecret), req.body?.mfaCode, { lastStep: voter.mfaLastStep })
      mfaOk = mfaStep !== null
    }
  }

  if (!idsOk || !mfaOk) {
    await recordFailure(prisma.voter, voter)
    return res.status(401).json({ message: 'Those details do not match your verified record.' })
  }

  await clearFailures(prisma.voter, voter)
  if (mfaStep !== null) await prisma.voter.update({ where: { id: voter.id }, data: { mfaLastStep: mfaStep } })
  res.json({ loginProof: signPurposeToken(voter.id, 'vote-login', '10m') })
}))

export default router
