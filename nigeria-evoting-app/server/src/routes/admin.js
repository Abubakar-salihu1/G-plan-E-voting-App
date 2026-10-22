import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword, signAdminToken, signPurposeToken, verifyToken, DUMMY_HASH } from '../lib/auth.js'
import { appendAuditLog } from '../lib/auditLog.js'
import { encrypt, decrypt } from '../lib/crypto.js'
import { generateSecret, verifyTotp, otpauthUrl } from '../lib/totp.js'
import { isLocked, recordFailure, clearFailures } from '../lib/lockout.js'
import { rateLimit } from '../lib/rateLimit.js'
import { HttpError, wrap } from '../lib/http.js'
import { isEmail, normEmail, passwordProblem, isUuid } from '../lib/validate.js'
import { deliverCode } from '../lib/notify.js'
import { requireAdminAuth, requireRole } from '../middleware/requireAdminAuth.js'

const router = Router()
export const ADMIN_ROLES = ['super-admin', 'chairman', 'commissioner', 'staff']
const requireSuperAdmin = requireRole('super-admin')
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  key: (req) => `${req.ip}:${String(req.body?.identifier ?? '').toLowerCase()}`,
})
const activateLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10 })

router.post('/invites', requireAdminAuth, requireSuperAdmin, wrap(async (req, res) => {
  const email = normEmail(req.body?.email)
  const { role } = req.body ?? {}
  if (!isEmail(email) || !ADMIN_ROLES.includes(role)) {
    return res.status(400).json({ message: `A valid email and a role (${ADMIN_ROLES.join(', ')}) are required.` })
  }
  if (await prisma.admin.findUnique({ where: { email } })) {
    return res.status(409).json({ message: 'An admin with this email already exists.' })
  }
  const invite = await prisma.adminInvite.create({ data: { email, role, invitedBy: req.admin.email } })
  await appendAuditLog(req.admin.email, `Issued admin invite to ${email} (role: ${role})`)
  // Emailed when SMTP is configured; otherwise (dev only) the code is echoed back.
  const delivery = await deliverCode('Invite', email, invite.code)
  res.status(201).json({ email: invite.email, role: invite.role, code: delivery.devOnlyCode, emailed: !!delivery.emailed })
}))

router.post('/activate', activateLimiter, wrap(async (req, res) => {
  const { inviteCode, password } = req.body ?? {}
  if (!isUuid(inviteCode)) return res.status(404).json({ message: 'Invite code not found.' })
  const pwProblem = passwordProblem(password)
  if (pwProblem) return res.status(400).json({ message: pwProblem })

  const invite = await prisma.adminInvite.findUnique({ where: { code: inviteCode } })
  if (!invite) return res.status(404).json({ message: 'Invite code not found.' })
  if (invite.usedAt) return res.status(410).json({ message: 'This invite has already been used.' })
  if (Date.now() - invite.createdAt.getTime() > INVITE_TTL_MS) {
    return res.status(410).json({ message: 'This invite has expired.' })
  }
  if (await prisma.admin.findUnique({ where: { email: invite.email } })) {
    return res.status(409).json({ message: 'An admin with this email already exists.' })
  }

  const passwordHash = await hashPassword(password)

  const result = await prisma.$transaction(async (tx) => {
    // Atomically claim the invite: two simultaneous activations can't both win.
    const claimed = await tx.adminInvite.updateMany({
      where: { code: inviteCode, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (claimed.count !== 1) throw new HttpError(410, 'This invite has already been used.')

    const admin = await tx.admin.create({ data: { email: invite.email, passwordHash, role: invite.role } })
    await appendAuditLog(admin.email, `Activated admin account (role: ${admin.role})`, tx)

    // Succession: only one active super-admin at a time.
    let revoked = 0
    if (admin.role === 'super-admin') {
      const previous = await tx.admin.findMany({
        where: { role: 'super-admin', active: true, id: { not: admin.id } },
      })
      for (const old of previous) {
        await tx.admin.update({ where: { id: old.id }, data: { active: false } })
        await appendAuditLog(admin.email, `Automatic succession: revoked previous super-admin ${old.email}`, tx)
      }
      revoked = previous.length
    }
    return revoked
  })

  res.status(201).json({ message: 'Account activated. You can now sign in.', revokedPreviousSuperAdmins: result })
}))

// ── Login (password → TOTP; first login forces MFA enrolment) ───────────────
router.post('/login', loginLimiter, wrap(async (req, res) => {
  const { identifier, password, mfaCode } = req.body ?? {}
  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'identifier and password are required.' })
  }

  const id = identifier.trim()
  const admin = await prisma.admin.findFirst({
    where: { OR: [{ email: id.toLowerCase() }, { staffId: id }] },
  })
  const passwordOk = await verifyPassword(password, admin?.passwordHash ?? DUMMY_HASH)

  if (admin && isLocked(admin)) {
    return res.status(429).json({ message: 'Too many failed attempts — account temporarily locked.' })
  }
  if (!admin || !admin.active || !passwordOk) {
    if (admin) await recordFailure(prisma.admin, admin)
    return res.status(401).json({ message: 'Invalid credentials.' })
  }

  // MFA is mandatory for every admin. Not yet enrolled → short-lived setup token only.
  if (!admin.mfaEnabled) {
    return res.json({ mfaSetupRequired: true, setupToken: signPurposeToken(admin.id, 'admin-mfa-setup', '10m') })
  }
  if (!mfaCode) return res.status(400).json({ message: 'Enter the 6-digit authenticator code.' })

  const step = verifyTotp(decrypt(admin.mfaSecret), mfaCode, { lastStep: admin.mfaLastStep })
  if (step === null) {
    await recordFailure(prisma.admin, admin)
    return res.status(401).json({ message: 'Invalid credentials.' })
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { mfaLastStep: step } })
  await clearFailures(prisma.admin, admin)
  await appendAuditLog(admin.email, 'Signed in')
  res.json({ token: signAdminToken(admin), admin: { id: admin.id, email: admin.email, role: admin.role } })
}))

function adminFromSetupToken(token) {
  try {
    return verifyToken(String(token), 'admin-mfa-setup').sub
  } catch {
    throw new HttpError(401, 'Setup session expired — sign in again.')
  }
}

router.post('/mfa/setup', loginLimiter, wrap(async (req, res) => {
  const adminId = adminFromSetupToken(req.body?.setupToken)
  const admin = await prisma.admin.findUnique({ where: { id: adminId } })
  if (!admin || !admin.active) throw new HttpError(401, 'Account not available.')
  if (admin.mfaEnabled) throw new HttpError(409, 'MFA is already enabled for this account.')
  const secret = generateSecret()
  await prisma.admin.update({ where: { id: admin.id }, data: { mfaSecret: encrypt(secret) } })
  res.json({ secret, otpauthUrl: otpauthUrl(secret, admin.email) })
}))

router.post('/mfa/confirm', loginLimiter, wrap(async (req, res) => {
  const adminId = adminFromSetupToken(req.body?.setupToken)
  const admin = await prisma.admin.findUnique({ where: { id: adminId } })
  if (!admin || !admin.active) throw new HttpError(401, 'Account not available.')
  if (admin.mfaEnabled) throw new HttpError(409, 'MFA is already enabled for this account.')
  if (!admin.mfaSecret) throw new HttpError(400, 'Start MFA setup first.')

  const step = verifyTotp(decrypt(admin.mfaSecret), req.body?.code)
  if (step === null) throw new HttpError(401, 'That code is not correct — check your authenticator app.')

  await prisma.admin.update({ where: { id: admin.id }, data: { mfaEnabled: true, mfaLastStep: step } })
  await appendAuditLog(admin.email, 'MFA enrolled and signed in')
  res.json({ token: signAdminToken(admin), admin: { id: admin.id, email: admin.email, role: admin.role } })
}))

router.post('/logout', requireAdminAuth, wrap(async (req, res) => {
  await prisma.admin.update({ where: { id: req.admin.id }, data: { tokenVersion: { increment: 1 } } })
  res.json({ message: 'Signed out.' })
}))

router.get('/me', requireAdminAuth, (req, res) => {
  res.json({ admin: { id: req.admin.id, email: req.admin.email, role: req.admin.role } })
})

router.get('/', requireAdminAuth, requireSuperAdmin, wrap(async (_req, res) => {
  const admins = await prisma.admin.findMany({
    select: { id: true, email: true, staffId: true, role: true, active: true, mfaEnabled: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ admins })
}))

router.post('/:id/revoke', requireAdminAuth, requireSuperAdmin, wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ message: 'Admin not found.' })
  const target = await prisma.admin.findUnique({ where: { id: req.params.id } })
  if (!target) return res.status(404).json({ message: 'Admin not found.' })
  if (target.id === req.admin.id) {
    return res.status(400).json({ message: 'You cannot revoke your own access — issue a successor invite instead.' })
  }
  await prisma.admin.update({ where: { id: target.id }, data: { active: false } })
  await appendAuditLog(req.admin.email, `Revoked admin access for ${target.email} (role: ${target.role})`)
  res.json({ message: `Access revoked for ${target.email}.` })
}))

export default router
