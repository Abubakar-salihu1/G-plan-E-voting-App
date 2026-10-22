import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import PartyBadge from '../../components/PartyBadge'
import { useElectionData } from '../../lib/store'

export default function Ballot() {
  const navigate = useNavigate()
  const { parties, loading } = useElectionData()
  const [index, setIndex] = useState(0)
  const [selections, setSelections] = useState<Record<string, string>>({})

  const contestNames = [...new Set(parties.map((p) => p.contest))]

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-ink/50">
        Loading your ballot…
      </div>
    )
  }

  if (contestNames.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <EmblemLogo className="mx-auto h-9 w-9" />
        <h1 className="mt-4 font-serif text-xl font-semibold text-ink">No ballot available yet</h1>
        <p className="mt-3 text-ink/60">
          The election commission hasn't uploaded any parties or candidates for this election yet.
          Check back closer to polling day.
        </p>
        <Link to="/dashboard" className="mt-6 inline-block font-medium text-green-700">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const contestName = contestNames[index]
  const candidates = parties.filter((p) => p.contest === contestName)
  const selected = selections[contestName]
  const isLast = index === contestNames.length - 1

  function choose(candidateId: string) {
    setSelections((s) => ({ ...s, [contestName]: candidateId }))
  }

  function next() {
    if (!selected) return
    if (isLast) {
      sessionStorage.setItem('naijavote_selections', JSON.stringify(selections))
      navigate('/vote/review')
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-2 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <div>
          <p className="font-serif text-lg font-semibold text-ink">{contestName}</p>
          <p className="text-xs text-ink/50">
            {index + 1} of {contestNames.length} contests
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs">
        <a href="/candidates" target="_blank" rel="noopener noreferrer" className="font-medium text-green-700 underline">
          Read about the candidates first (opens in a new tab)
        </a>
      </p>

      <div className="mb-6 mt-3 flex gap-1">
        {contestNames.map((c, i) => (
          <div
            key={c}
            className={
              'h-1.5 flex-1 rounded-full ' +
              (i < index ? 'bg-green-700' : i === index ? 'bg-green-700/50' : 'bg-ink/10')
            }
          />
        ))}
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Choose your candidate for {contestName}</legend>
        {candidates.map((c) => (
          <label
            key={c.id}
            className={
              'flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ' +
              (selected === c.id
                ? 'border-green-700 bg-green-700/5'
                : 'border-ink/10 bg-white hover:border-ink/25')
            }
          >
            <input
              type="radio"
              name={contestName}
              value={c.id}
              checked={selected === c.id}
              onChange={() => choose(c.id)}
              className="h-5 w-5 accent-green-700"
            />
            <PartyBadge party={c.acronym} logoUrl={c.logoUrl} size="lg" />
            <div>
              <p className="font-medium text-ink">{c.candidateName}</p>
              <p className="text-sm text-ink/60">{c.name}</p>
            </div>
          </label>
        ))}
      </fieldset>

      <div className="mt-6 flex gap-3">
        {index > 0 && (
          <button
            onClick={() => setIndex((i) => i - 1)}
            className="rounded-full border border-ink/20 px-5 py-3 font-semibold text-ink"
          >
            Back
          </button>
        )}
        <button
          onClick={next}
          disabled={!selected}
          className="flex-1 rounded-full bg-green-700 py-3 font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast ? 'Review all my votes' : 'Next contest'}
        </button>
      </div>
    </div>
  )
}
