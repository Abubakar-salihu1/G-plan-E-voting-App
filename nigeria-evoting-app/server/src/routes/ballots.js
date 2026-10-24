import { Router } from 'express'
import crypto from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { hmac } from '../lib/crypto.js'
import { verifyToken } from '../lib/auth.js'
import { appendAuditLog } from '../lib/auditLog.js'
import { rateLimit } from '../lib/rateLimit.js'
import { HttpError, wrap } from '../lib/http.js'
import { isUuid } from '../lib/validate.js'
import { isOpen } from '../lib/electionState.js'
import { faceProvider, parseImageDataUrl } from '../lib/faceProvider.js'
import { requireGoodPhoto } from '../lib/imageQuality.js'
import { requireVoterAuth } from '../middleware/requireVoterAuth.js'

const router = Router()
const TOKEN_TTL_MS = 30 * 60 * 1000
const MAX_SELECTIONS = 50

const tokenLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, key: (r) => r.voter?.id ?? r.ip })
const castLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, key: (r) => r.voter?.id ?? r.ip })
const receiptLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30 })

const hourOf = (d) => new Date(Math.floor(d.getTime() / 3_600_000) * 3_600_000)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// POST /api/ballots/token — { loginProof, image }
// Requires: verified voter + a fresh vote-login proof (PVC+NIN+MFA re-check)
// + a fresh face capture checked by the face provider. Issues one session
// token covering every election that is OPEN right now and that this voter
// has not already voted in.
router.post('/token', requireVoterAuth, tokenLimiter, wrap(async (req, res) => {
  const voter = req.voterRecord
  if (!voter.verified) {
    return res.status(403).json({ message: 'Your account must be fully verified before you can vote.' })
  }

  let proof
  try {
    proof = verifyToken(String(req.body?.loginProof), 'vote-login')
  } catch {
    return res.status(401).json({ message: 'Please confirm your voter card and NIN again before voting.' })
  }
  if (proof.sub !== voter.id) return res.status(401).json({ message: 'Verification does not match this account.' })

  const image = parseImageDataUrl(req.body?.image)
  await requireGoodPhoto(image)
  const { match } = await faceProvider().match({ image, enrolledTemplateHash: voter.faceTemplateHash })
  if (!match) return res.status(403).json({ message: 'Face check failed — please try again in good lighting.' })

  const now = new Date()
  const candidates = await prisma.election.findMany({ where: { status: 'locked' } })
  const open = candidates.filter((e) => isOpen(e, now))
  if (open.length === 0) return res.status(404).json({ message: 'There is no election open for voting right now.' })

  const raw = crypto.randomBytes(32).toString('hex')
  const tokenHash = hmac(raw, 'vtoken')
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS)

  const issuedFor = await prisma.$transaction(async (tx) => {
    const ids = []
    for (const e of open) {
      const existing = await tx.votingToken.findUnique({
        where: { voterId_electionId: { voterId: voter.id, electionId: e.id } },
      })
      if (existing?.spentAt) continue // already voted here — can never be re-issued
      if (existing) {
        await tx.votingToken.update({ where: { id: existing.id }, data: { tokenHash, expiresAt } })
      } else {
        await tx.votingToken.create({ data: { tokenHash, voterId: voter.id, electionId: e.id, expiresAt } })
      }
      ids.push(e.id)
    }
    return ids
  })

  if (issuedFor.length === 0) {
    return res.status(409).json({ message: 'You have already voted in every election currently open.' })
  }
  res.status(201).json({ token: raw, electionIds: issuedFor })
}))

// POST /api/ballots — { token, selections: [{ partyId }, ...] }
router.post('/', requireVoterAuth, castLimiter, wrap(async (req, res) => {
  const voterId = req.voter.id
  const { token, selections } = req.body ?? {}
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) {
    return res.status(400).json({ message: 'A valid voting token is required.' })
  }
  if (!Array.isArray(selections) || selections.length === 0 || selections.length > MAX_SELECTIONS) {
    return res.status(400).json({ message: `Send between 1 and ${MAX_SELECTIONS} selections.` })
  }
  const partyIds = selections.map((s) => s?.partyId)
  if (!partyIds.every(isUuid) || new Set(partyIds).size !== partyIds.length) {
    return res.status(400).json({ message: 'Selections are invalid or contain duplicates.' })
  }

  const parties = await prisma.party.findMany({ where: { id: { in: partyIds } }, include: { election: true } })
  if (parties.length !== partyIds.length) {
    return res.status(400).json({ message: 'One or more selected candidates could not be found.' })
  }

  // Every election involved must be open right now, and only ONE choice per contest.
  const now = new Date()
  const seenContests = new Set()
  for (const p of parties) {
    if (!isOpen(p.election, now)) {
      return res.status(409).json({ message: `Voting is not open for "${p.election.name}".` })
    }
    const key = `${p.electionId}::${p.contest}`
    if (seenContests.has(key)) {
      return res.status(400).json({ message: `Only one candidate can be chosen for "${p.contest}".` })
    }
    seenContests.add(key)
  }
  const electionIds = [...new Set(parties.map((p) => p.electionId))]
  const tokenHash = hmac(token, 'vtoken')

  const receiptRaw = crypto.randomBytes(8).toString('hex').toUpperCase() // 64 bits
  const receipt = `NV-${receiptRaw.match(/.{4}/g).join('-')}`
  const castHour = hourOf(now)

  await prisma.$transaction(async (tx) => {
    // Spend the token(s) with a conditional UPDATE: of two simultaneous
    // requests only one can flip spentAt from NULL, so double-voting is
    // impossible even under a race.
    for (const electionId of electionIds) {
      const spent = await tx.votingToken.updateMany({
        where: { voterId, electionId, tokenHash, spentAt: null, expiresAt: { gt: now } },
        data: { spentAt: now },
      })
      if (spent.count !== 1) {
        throw new HttpError(409, 'This voting session is invalid, expired, or you have already voted.')
      }
    }

    // Ballots carry NO voter id and NO token — only election, party, coarse hour.
    await tx.ballot.createMany({
      data: shuffle(parties.map((p) => ({ electionId: p.electionId, partyId: p.id, castHour }))),
    })
    for (const p of parties) {
      await tx.party.update({ where: { id: p.id }, data: { voteCount: { increment: 1 } } })
    }
    await tx.receipt.create({ data: { receiptHash: hmac(receipt, 'receipt'), castHour } })
    // Actor is 'system' on purpose: the audit log must not link a person to a ballot.
    await appendAuditLog('system', `Ballot submitted (${parties.length} contest${parties.length > 1 ? 's' : ''})`, tx)
  })

  res.status(201).json({ receipt })
}))

// GET /api/ballots/receipt/:code — public: was a submission with this receipt recorded?
router.get('/receipt/:code', receiptLimiter, wrap(async (req, res) => {
  const code = String(req.params.code).toUpperCase().trim()
  if (!/^NV(-[0-9A-F]{4}){4}$/.test(code)) return res.status(400).json({ message: 'That is not a valid receipt code.' })
  const found = await prisma.receipt.findUnique({ where: { receiptHash: hmac(code, 'receipt') } })
  res.json({ recorded: !!found })
}))

export default router
