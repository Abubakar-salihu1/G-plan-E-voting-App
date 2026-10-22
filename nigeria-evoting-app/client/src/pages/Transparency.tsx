import { useEffect, useState } from 'react'
import EmblemLogo from '../components/EmblemLogo'
import PartyBadge from '../components/PartyBadge'
import Skeleton from '../components/Skeleton'
import { useElectionData } from '../lib/store'

export default function Transparency() {
  const { parties, loading, refresh } = useElectionData()
  const [reported, setReported] = useState(false)
  const [reportError, setReportError] = useState('')

  useEffect(() => {
    const t = setInterval(refresh, 8000) // keeps this genuinely live
    return () => clearInterval(t)
  }, [refresh])

  const contestNames = [...new Set(parties.map((p) => p.contest))]
  const totalVotesCast = parties.reduce((sum, p) => sum + p.voteCount, 0)

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-serif text-sm font-semibold uppercase tracking-wide text-green-700">
        Observer &amp; transparency portal
      </p>
      <div className="mt-3 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <h1 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">
          Open to anyone — no login required
        </h1>
      </div>

      {/* Turnout stats */}
      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['Registered voters', '—'],
            ['Votes cast so far', String(totalVotesCast)],
            ['Turnout', '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-ink/10 bg-white p-4">
              <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
              <p className="text-xs text-ink/50">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Live tallies per contest */}
      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">
        Live tally by contest
      </h2>
      {loading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : contestNames.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50">
          No contests configured yet — this section fills in once the election commission
          uploads parties and candidates.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {contestNames.map((contest) => {
            const candidates = parties.filter((p) => p.contest === contest)
            const contestTotal = candidates.reduce((sum, c) => sum + c.voteCount, 0)
            return (
              <div key={contest} className="rounded-2xl border border-ink/10 bg-white p-5">
                <p className="text-sm font-semibold text-ink">{contest}</p>
                <ul className="mt-3 space-y-2">
                  {candidates.map((c) => {
                    const pct = contestTotal > 0 ? Math.round((c.voteCount / contestTotal) * 100) : 0
                    return (
                      <li key={c.id}>
                        <div className="mb-1 flex items-center justify-between text-xs font-medium text-ink/70">
                          <span className="flex items-center gap-1.5">
                            <PartyBadge party={c.acronym} logoUrl={c.logoUrl} size="sm" />
                            {c.acronym}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
                          <div className="h-full rounded-full bg-green-700 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-ink/40">
        Aggregate totals only — individual votes are never shown here or anywhere else.
      </p>

      {/* Audit summary */}
      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">
        Audit trail summary
      </h2>
      <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink/70">
        Every system action is written to a hash-chained, append-only log. Observers can verify
        the chain independently without ever seeing an individual ballot — the full log is
        available to accredited observers on request; a public checkpoint hash will be posted here
        once voting opens.
      </div>

      {/* Public incident reporting */}
      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">
        Report an incident
      </h2>
      {reported ? (
        <div className="mt-4 rounded-2xl border border-green-700/30 bg-green-700/5 p-5 text-sm text-ink">
          Thanks — your report has been logged for review by election administrators.
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setReportError('')
            const text = String(new FormData(e.currentTarget).get('report') || '').trim()
            try {
              const res = await fetch('/api/incidents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: text.slice(0, 150), description: text }),
              })
              if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setReportError(data.message || 'Could not submit your report.')
                return
              }
              setReported(true)
            } catch {
              setReportError('Could not reach the server.')
            }
          }}
          className="mt-4 space-y-3 rounded-2xl border border-ink/10 bg-white p-5"
        >
          {reportError && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{reportError}</p>}
          <textarea
            name="report"
            required
            minLength={3}
            maxLength={2000}
            rows={3}
            placeholder="Describe what you observed, including location if relevant…"
            className="w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
          />
          <button
            type="submit"
            className="rounded-full bg-green-700 px-6 py-2.5 font-semibold text-white hover:bg-green-900"
          >
            Submit report
          </button>
        </form>
      )}
    </div>
  )
}
