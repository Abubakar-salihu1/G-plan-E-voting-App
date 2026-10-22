import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdminAuth } from '../middleware/requireAdminAuth.js'
import { verifyAuditChain } from '../lib/auditLog.js'
import { wrap } from '../lib/http.js'

const router = Router()

// GET /api/audit-log?page=1&limit=50 — ADMIN ONLY, read-only, newest first.
router.get('/', requireAdminAuth, wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
  const [entries, total] = await Promise.all([
    prisma.auditLogEntry.findMany({
      orderBy: { seq: 'desc' }, skip: (page - 1) * limit, take: limit,
      select: { id: true, seq: true, actor: true, action: true, hash: true, createdAt: true },
    }),
    prisma.auditLogEntry.count(),
  ])
  res.json({ entries, total, page, limit })
}))

// GET /api/audit-log/verify — recompute the whole hash chain.
router.get('/verify', requireAdminAuth, wrap(async (_req, res) => {
  res.json(await verifyAuditChain())
}))

export default router
