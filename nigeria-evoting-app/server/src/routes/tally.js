import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { wrap } from '../lib/http.js'
import { isUuid } from '../lib/validate.js'

const router = Router()

// GET /api/tally/:electionId — public. Aggregates computed from the Ballot
// rows themselves (the source of truth), never individual ballots.
router.get('/:electionId', wrap(async (req, res) => {
  if (!isUuid(req.params.electionId)) return res.status(404).json({ message: 'Election not found.' })
  const election = await prisma.election.findUnique({
    where: { id: req.params.electionId },
    include: { parties: { orderBy: { createdAt: 'asc' } } },
  })
  if (!election) return res.status(404).json({ message: 'Election not found.' })

  const [grouped, turnout] = await Promise.all([
    prisma.ballot.groupBy({ by: ['partyId'], where: { electionId: election.id }, _count: { _all: true } }),
    prisma.votingToken.count({ where: { electionId: election.id, spentAt: { not: null } } }),
  ])
  const counts = new Map(grouped.map((g) => [g.partyId, g._count._all]))

  res.json({
    electionId: election.id,
    turnout,
    totals: election.parties.map((p) => ({
      partyId: p.id, contest: p.contest, acronym: p.acronym,
      candidateName: p.candidateName, votes: counts.get(p.id) ?? 0,
    })),
    updatedAt: new Date().toISOString(),
  })
}))

export default router
