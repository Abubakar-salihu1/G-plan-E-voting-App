import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdminAuth } from '../middleware/requireAdminAuth.js'
import { appendAuditLog } from '../lib/auditLog.js'
import { rateLimit } from '../lib/rateLimit.js'
import { wrap } from '../lib/http.js'
import { isStr, isUuid } from '../lib/validate.js'

const router = Router()
const SEVERITIES = ['low', 'medium', 'high']
const STATUSES = ['open', 'resolved']
const publicLimiter = rateLimit({ windowMs: 60 * 60_000, max: 5, message: 'Too many reports from this network — try again later.' })

router.get('/', requireAdminAuth, wrap(async (_req, res) => {
  const incidents = await prisma.incident.findMany({ orderBy: { reportedAt: 'desc' }, take: 200 })
  res.json({ incidents })
}))

// Public: anyone can report. Severity is always 'low' until an admin triages it.
router.post('/', publicLimiter, wrap(async (req, res) => {
  const { title, description } = req.body ?? {}
  if (!isStr(title, 3, 150)) return res.status(400).json({ message: 'Give the report a short title (3–150 characters).' })
  if (description != null && !isStr(description, 0, 2000)) return res.status(400).json({ message: 'Description is too long (max 2000 characters).' })
  const incident = await prisma.incident.create({
    data: { title: title.trim(), description: description ? description.trim() : null },
  })
  res.status(201).json({ incident: { id: incident.id } })
}))

router.patch('/:id', requireAdminAuth, wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ message: 'Incident not found.' })
  const { severity, status } = req.body ?? {}
  if (severity !== undefined && !SEVERITIES.includes(severity)) return res.status(400).json({ message: 'Invalid severity.' })
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status.' })
  if (severity === undefined && status === undefined) return res.status(400).json({ message: 'Nothing to update.' })

  const existing = await prisma.incident.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ message: 'Incident not found.' })
  const incident = await prisma.incident.update({ where: { id: existing.id }, data: { severity, status } })
  await appendAuditLog(req.admin.email, `Updated incident "${existing.title}" (${[severity && `severity: ${severity}`, status && `status: ${status}`].filter(Boolean).join(', ')})`)
  res.json({ incident })
}))

export default router
