import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdminAuth, requireRole } from '../middleware/requireAdminAuth.js'
import { appendAuditLog } from '../lib/auditLog.js'
import { wrap } from '../lib/http.js'
import { isUuid } from '../lib/validate.js'
import { createRecoveryService } from '../lib/recovery.js'
import { hmac } from '../lib/crypto.js'
import { sendNotice } from '../lib/notify.js'

const router = Router()

const statusOf = (v) =>
  v.verified ? 'approved' : v.ninHash && v.pvcHash && v.faceTemplateHash ? 'pending' : 'incomplete'

// GET /api/voters/stats — headline numbers for the admin dashboard (counts only, no personal data).
router.get('/stats', requireAdminAuth, wrap(async (_req, res) => {
  const [registered, verified, withIdentity, votesCast] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { verified: true } }),
    prisma.voter.count({ where: { verified: false, ninHash: { not: null }, pvcHash: { not: null }, faceTemplateHash: { not: null } } }),
    prisma.votingToken.count({ where: { spentAt: { not: null } } }),
  ])
  res.json({ registered, verified, pendingReview: withIdentity, votesCast })
}))

// GET /api/voters?status=pending|approved|incomplete|all — ADMIN ONLY.
// Never returns hashes, secrets or raw identifiers.
router.get('/', requireAdminAuth, wrap(async (req, res) => {
  const status = String(req.query.status ?? 'all')
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))

  const rows = await prisma.voter.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, verified: true, ninHash: true, pvcHash: true, faceTemplateHash: true, createdAt: true },
  })
  const mapped = rows
    .map((v) => ({ id: v.id, email: v.email, status: statusOf(v), createdAt: v.createdAt }))
    .filter((v) => status === 'all' || v.status === status)
  res.json({ voters: mapped.slice((page - 1) * limit, page * limit), total: mapped.length, page, limit })
}))

// PATCH /api/voters/:id/verification — { decision: 'approve' | 'reject' }
router.patch('/:id/verification', requireAdminAuth, wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ message: 'Voter not found.' })
  const { decision } = req.body ?? {}
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'approve' or 'reject'." })
  }
  const voter = await prisma.voter.findUnique({ where: { id: req.params.id } })
  if (!voter) return res.status(404).json({ message: 'Voter not found.' })

  if (decision === 'approve') {
    // Uniqueness of NIN / PVC / face is enforced by DB constraints, so approval
    // only needs to confirm all three steps (and the OTP) were completed.
    if (!voter.ninHash || !voter.pvcHash || !voter.faceTemplateHash || !voter.otpVerified) {
      return res.status(409).json({ message: 'This voter has not completed every verification step.' })
    }
    await prisma.voter.update({ where: { id: voter.id }, data: { verified: true } })
  } else {
    // Clearing the submitted identifiers lets the voter redo verification.
    await prisma.voter.update({
      where: { id: voter.id },
      data: { verified: false, ninHash: null, pvcHash: null, faceTemplateHash: null },
    })
  }
  await appendAuditLog(req.admin.email, `${decision === 'approve' ? 'Approved' : 'Rejected'} voter verification (${voter.id.slice(0, 8)})`)
  res.json({ message: decision === 'approve' ? 'Approved.' : 'Rejected.' })
}))

// POST /api/voters/:id/reset-mfa — SUPER-ADMIN ONLY. For a voter who lost their phone AND
// their backup codes. Removes passkeys/authenticator so they must enrol again on next sign-in.
// Always confirm the person's identity outside the app first (it is logged below).
const recovery = createRecoveryService({ prisma, hash: (code) => hmac(code, 'recovery') })
router.post('/:id/reset-mfa', requireAdminAuth, requireRole('super-admin'), wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ message: 'Voter not found.' })
  const voter = await prisma.voter.findUnique({ where: { id: req.params.id } })
  if (!voter) return res.status(404).json({ message: 'Voter not found.' })
  await recovery.resetMfa(voter.id)
  await appendAuditLog(req.admin.email, `Reset voter MFA (${voter.id.slice(0, 8)})`)
  sendNotice(voter.email, 'Your NaijaVote security was reset', 'The commission reset the passkey / authenticator on your NaijaVote account at your request. Sign in and set it up again. If you did not ask for this, contact the commission immediately.')
  res.json({ message: 'MFA reset. The voter must set it up again the next time they sign in.' })
}))

export default router
