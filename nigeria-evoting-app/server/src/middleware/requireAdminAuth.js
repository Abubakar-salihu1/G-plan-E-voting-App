import { verifyToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { wrap } from '../lib/http.js'

// Verifies an ADMIN-type token, then re-reads the account from the database on
// every request: revoked admins lose access immediately, and the role always
// comes from the database, never from the token.
export const requireAdminAuth = wrap(async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Missing admin session token.' })

  let payload
  try {
    payload = verifyToken(token, 'admin')
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session — sign in again.' })
  }

  const admin = await prisma.admin.findUnique({ where: { id: payload.sub } })
  if (!admin || !admin.active) {
    return res.status(401).json({ message: 'This account no longer has access.' })
  }
  if ((payload.tv ?? 0) !== admin.tokenVersion) {
    return res.status(401).json({ message: 'Your session ended — sign in again.' })
  }
  req.admin = { id: admin.id, sub: admin.id, email: admin.email, role: admin.role }
  next()
})

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.admin?.role)
    ? next()
    : res.status(403).json({ message: 'Your role is not permitted to do this.' })
