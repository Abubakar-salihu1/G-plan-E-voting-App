import { Router } from 'express'
import { zonedToUtc } from '../lib/zoned.js'
import { prisma } from '../lib/prisma.js'
import { requireAdminAuth, requireRole } from '../middleware/requireAdminAuth.js'
import { appendAuditLog } from '../lib/auditLog.js'
import { HttpError, wrap } from '../lib/http.js'
import { isStr, isUuid, isValidDate, isTimezone } from '../lib/validate.js'
import { phaseOf } from '../lib/electionState.js'

const router = Router()
const canManage = requireRole('super-admin', 'chairman', 'commissioner')
const LEVELS = ['federal', 'state', 'local']
const UPLOAD_URL = /^\/uploads\/[0-9a-f-]{36}\.(png|jpg|webp)$/ // images produced by our own upload route
const PDF_URL = /^\/uploads\/[0-9a-f-]{36}\.pdf$/
const isHttpUrl = (u) => {
  try {
    return ['http:', 'https:'].includes(new URL(u).protocol) && u.length <= 300
  } catch {
    return false
  }
}

const withPhase = (e) => ({ ...e, phase: phaseOf(e) })

router.get('/', wrap(async (_req, res) => {
  const elections = await prisma.election.findMany({
    include: { parties: { orderBy: { createdAt: 'asc' } } },
    orderBy: { startsAt: 'asc' },
  })
  res.json({ elections: elections.map(withPhase) })
}))

router.post('/', requireAdminAuth, canManage, wrap(async (req, res) => {
  const { name, level, state, lga, startsAt, endsAt, timezone, lockDate } = req.body ?? {}
  if (!isStr(name, 3, 200)) return res.status(400).json({ message: 'Election name must be 3–200 characters.' })
  if (!LEVELS.includes(level)) return res.status(400).json({ message: `level must be one of: ${LEVELS.join(', ')}.` })
  if (level !== 'federal' && !isStr(state, 2, 60)) return res.status(400).json({ message: 'State is required for state and local elections.' })
  if (level === 'local' && !isStr(lga, 2, 80)) return res.status(400).json({ message: 'LGA is required for local elections.' })
  if (!isValidDate(startsAt) || !isValidDate(endsAt)) return res.status(400).json({ message: 'Valid start and end times are required.' })
  if (!isTimezone(timezone)) return res.status(400).json({ message: 'Unknown timezone.' })

  // Times arrive as wall-clock values in the election's own timezone; store them as true instants.
  const start = zonedToUtc(startsAt, timezone)
  const end = zonedToUtc(endsAt, timezone)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return res.status(400).json({ message: 'Valid start and end times are required.' })
  if (end <= start) return res.status(400).json({ message: 'The voting window must end after it starts.' })
  if (end <= new Date()) return res.status(400).json({ message: 'The voting window must end in the future.' })
  let lock = null
  if (lockDate) {
    if (!isValidDate(lockDate)) return res.status(400).json({ message: 'Invalid roster lock date.' })
    lock = zonedToUtc(lockDate, timezone)
    if (Number.isNaN(lock.getTime())) return res.status(400).json({ message: 'Invalid roster lock date.' })
    if (lock > start) return res.status(400).json({ message: 'The roster must lock before voting starts.' })
  }

  const election = await prisma.election.create({
    data: {
      name: name.trim(), level,
      state: level === 'federal' ? null : state.trim(),
      lga: level === 'local' ? lga.trim() : null,
      startsAt: start, endsAt: end, timezone, lockDate: lock,
    },
  })
  await appendAuditLog(req.admin.email, `Created election "${election.name}" (${election.level})`)
  res.status(201).json({ election: withPhase({ ...election, parties: [] }) })
}))

router.post('/:id/lock', requireAdminAuth, canManage, wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ message: 'Election not found.' })
  const election = await prisma.election.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { parties: true } } },
  })
  if (!election) return res.status(404).json({ message: 'Election not found.' })
  if (election.status === 'locked') return res.status(409).json({ message: 'This roster is already locked.' })
  if (election.endsAt <= new Date()) return res.status(409).json({ message: 'This election has already ended.' })
  if (election._count.parties === 0) return res.status(409).json({ message: 'Add at least one candidate before locking the roster.' })

  const updated = await prisma.election.update({ where: { id: election.id }, data: { status: 'locked' } })
  await appendAuditLog(req.admin.email, `Locked roster for election "${election.name}"`)
  res.json({ election: withPhase(updated) })
}))

router.post('/:id/parties', requireAdminAuth, canManage, wrap(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ message: 'Election not found.' })
  const election = await prisma.election.findUnique({ where: { id: req.params.id } })
  if (!election) return res.status(404).json({ message: 'Election not found.' })
  if (election.status === 'locked') return res.status(409).json({ message: "This election's roster is locked." })

  const { contest, name, acronym, candidateName, logoUrl, candidatePhotoUrl, slogan, runningMate, bio, manifestoUrl, websiteUrl } = req.body ?? {}
  if (!isStr(contest, 2, 120) || !isStr(name, 2, 150) || !isStr(acronym, 1, 12) || !isStr(candidateName, 2, 150)) {
    return res.status(400).json({ message: 'contest, name, acronym (≤12 chars) and candidateName are required.' })
  }
  for (const url of [logoUrl, candidatePhotoUrl]) {
    if (url && !UPLOAD_URL.test(url)) return res.status(400).json({ message: 'Images must be uploaded through the upload form.' })
  }

  if (slogan && !isStr(slogan, 1, 150)) return res.status(400).json({ message: 'Slogan must be 150 characters or fewer.' })
  if (runningMate && !isStr(runningMate, 2, 150)) return res.status(400).json({ message: 'Running mate must be 2–150 characters.' })
  if (bio && !isStr(bio, 1, 2000)) return res.status(400).json({ message: 'Biography must be 2000 characters or fewer.' })
  if (manifestoUrl && !PDF_URL.test(manifestoUrl)) return res.status(400).json({ message: 'The manifesto must be a PDF uploaded through the upload form.' })
  if (websiteUrl && !isHttpUrl(websiteUrl)) return res.status(400).json({ message: 'Website must be a full http(s) link.' })

  const clash = await prisma.party.findFirst({
    where: { electionId: election.id, contest: contest.trim(), acronym: { equals: acronym.trim(), mode: 'insensitive' } },
  })
  if (clash) return res.status(409).json({ message: `${acronym.trim()} is already on the "${contest.trim()}" ballot.` })

  const party = await prisma.party.create({
    data: {
      electionId: election.id, contest: contest.trim(), name: name.trim(),
      acronym: acronym.trim().toUpperCase(), candidateName: candidateName.trim(),
      logoUrl: logoUrl || null, candidatePhotoUrl: candidatePhotoUrl || null,
      slogan: slogan?.trim() || null, runningMate: runningMate?.trim() || null, bio: bio?.trim() || null,
      manifestoUrl: manifestoUrl || null, websiteUrl: websiteUrl?.trim() || null,
    },
  })
  await appendAuditLog(req.admin.email, `Added ${party.acronym} (${party.candidateName}) to "${party.contest}" in election "${election.name}"`)
  res.status(201).json({ party })
}))

router.delete('/:id/parties/:partyId', requireAdminAuth, canManage, wrap(async (req, res) => {
  if (!isUuid(req.params.id) || !isUuid(req.params.partyId)) return res.status(404).json({ message: 'Party not found on this election.' })
  const party = await prisma.party.findUnique({ where: { id: req.params.partyId } })
  if (!party || party.electionId !== req.params.id) return res.status(404).json({ message: 'Party not found on this election.' })
  const election = await prisma.election.findUnique({ where: { id: req.params.id } })
  if (election?.status === 'locked') return res.status(409).json({ message: "This election's roster is locked." })

  await prisma.party.delete({ where: { id: party.id } })
  await appendAuditLog(req.admin.email, `Removed ${party.acronym} from "${party.contest}"`)
  res.json({ message: 'Removed.' })
}))

export default router
