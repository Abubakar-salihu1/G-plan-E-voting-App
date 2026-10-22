import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import PartyBadge from '../../components/PartyBadge'
import { useElectionData } from '../../lib/store'
import { voterFetch } from '../../lib/voterAuth'

export default function ReviewVote() {
  const navigate = useNavigate()
  const { parties } = useElectionData()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const raw = sessionStorage.getItem('naijavote_selections')
  const selections: Record<string, string> = raw ? JSON.parse(raw) : {}
  const contestNames = Object.keys(selections)

  async function handleConfirm() {
    if (contestNames.length === 0) return
    const token = sessionStorage.getItem('naijavote_voting_token')
    if (!token) {
      setError('Your voting session expired — please start again from your dashboard.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await voterFetch('/api/ballots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          selections: Object.values(selections).map((partyId) => ({ partyId })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not submit your vote.')
        return
      }
      sessionStorage.setItem('naijavote_receipt', data.receipt)
      sessionStorage.removeItem('naijavote_selections')
      sessionStorage.removeItem('naijavote_voting_token')
      navigate('/vote/receipt')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  if (contestNames.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-ink/60">
        No selections found — please{' '}
        <button onClick={() => navigate('/vote/ballot')} className="text-green-700 underline">
          go back to the ballot
        </button>
        .
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <p className="font-serif text-lg font-semibold text-ink">Review your votes</p>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {contestNames.map((contestName) => {
          const candidate = parties.find((p) => p.id === selections[contestName])
          if (!candidate) return null
          return (
            <div
              key={contestName}
              className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4"
            >
              <PartyBadge party={candidate.acronym} logoUrl={candidate.logoUrl} />
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/45">{contestName}</p>
                <p className="mt-1 font-serif text-lg font-semibold text-ink">
                  {candidate.candidateName}
                </p>
                <p className="text-sm text-ink/60">{candidate.name}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-xl bg-ink/5 p-4 text-sm text-ink/70">
        Once you submit, none of this can be changed and you cannot vote again. Your identity is
        never stored alongside any of these choices.
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate('/vote/ballot')}
          className="w-full rounded-full border border-ink/20 py-2.5 font-semibold text-ink"
        >
          Change votes
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Confirm & submit'}
        </button>
      </div>
    </div>
  )
}
