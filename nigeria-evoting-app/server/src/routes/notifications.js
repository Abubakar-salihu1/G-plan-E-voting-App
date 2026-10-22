import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdminAuth, requireRole } from '../middleware/requireAdminAuth.js'
import { appendAuditLog } from '../lib/auditLog.js'
import { wrap } from '../lib/http.js'
import { isStr } from '../lib/validate.js'

const router = Router()
const AUDIENCES = ['All verified voters', 'All admins & staff', 'Unverified accounts']

async function audienceSize(audience) {
  if (audience === 'All verified voters') return prisma.voter.count({ where: { verified: true } })
  if (audience === 'Unverified accounts') return prisma.voter.count({ where: { verified: false } })
  return prisma.admin.count({ where: { active: true } })
}

router.get('/', requireAdminAuth, wrap(async (_req, res) => {
  const notifications = await prisma.notification.findMany({ orderBy: { sentAt: 'desc' }, take: 50 })
  res.json({ notifications })
}))

// Records the broadcast and reports audience size. Actual push/email/SMS
// fan-out needs a delivery provider, which isn't wired in yet.
router.post('/broadcast', requireAdminAuth, requireRole('super-admin', 'chairman', 'commissioner'), wrap(async (req, res) => {
  const { title, message, audience } = req.body ?? {}
  if (!isStr(title, 3, 150)) return res.status(400).json({ message: 'Title must be 3–150 characters.' })
  if (message != null && !isStr(message, 0, 2000)) return res.status(400).json({ message: 'Message is too long (max 2000 characters).' })
  if (!AUDIENCES.includes(audience)) return res.status(400).json({ message: 'Unknown audience.' })

  const notification = await prisma.notification.create({
    data: { title: title.trim(), message: message ? message.trim() : null, audience, createdBy: req.admin.email },
  })
  const recipients = await audienceSize(audience)
  await appendAuditLog(req.admin.email, `Broadcast "${notification.title}" to ${audience} (${recipients} recipients)`)
  res.status(201).json({ notification, recipients, delivered: false })
}))

export default router
