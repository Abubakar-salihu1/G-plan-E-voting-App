import { verifyToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { wrap } from '../lib/http.js'

export const requireVoterAuth = wrap(async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Missing session token.' })

  let payload
  try {
    payload = verifyToken(token, 'voter')
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session — sign in again.' })
  }

  const voter = await prisma.voter.findUnique({ where: { id: payload.sub } })
  if (!voter) return res.status(401).json({ message: 'Account not found.' })
  // Signing out, resetting the password or resetting MFA bumps tokenVersion and ends old sessions.
  if ((payload.tv ?? 0) !== voter.tokenVersion) {
    return res.status(401).json({ message: 'Your session ended — sign in again.' })
  }
  req.voter = { id: voter.id, sub: voter.id, email: voter.email }
  req.voterRecord = voter
  next()
})
