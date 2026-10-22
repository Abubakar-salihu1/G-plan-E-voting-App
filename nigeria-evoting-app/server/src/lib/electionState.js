// "Open" is derived, never trusted from a stored flag: the roster must be
// locked AND the current time must be inside the voting window.
export function phaseOf(election, now = new Date()) {
  if (election.status !== 'locked') return 'draft'
  if (now < election.startsAt) return 'scheduled'
  if (now > election.endsAt) return 'closed'
  return 'open'
}

export const isOpen = (election, now = new Date()) => phaseOf(election, now) === 'open'
