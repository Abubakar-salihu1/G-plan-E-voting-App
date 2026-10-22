import { useState } from 'react'
import { Link } from 'react-router-dom'
import EmblemLogo from '../components/EmblemLogo'
import PartyBadge from '../components/PartyBadge'
import Skeleton from '../components/Skeleton'
import { useElectionData, type Party } from '../lib/store'

function Detail({ p }: { p: Party }) {
  const [open, setOpen] = useState(false)
  const long = (p.bio?.length ?? 0) > 180
  return (
    <div className="mt-3 space-y-2 text-sm text-ink/80">
      {p.slogan && <p className="italic text-ink/70">“{p.slogan}”</p>}
      {p.runningMate && (
        <p>
          <span className="font-medium text-ink">Running mate:</span> {p.runningMate}
        </p>
      )}
      {p.bio && (
        <p className="whitespace-pre-line">
          {open || !long ? p.bio : p.bio.slice(0, 180) + '…'}
          {long && (
            <button onClick={() => setOpen(!open)} className="ml-1 font-medium text-green-700">
              {open ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-4 pt-1">
        {p.manifestoUrl && (
          <a href={p.manifestoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-green-700 underline">
            Read manifesto (PDF)
          </a>
        )}
        {p.websiteUrl && (
          <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-green-700 underline">
            Website
          </a>
        )}
      </div>
      {!p.slogan && !p.runningMate && !p.bio && !p.manifestoUrl && !p.websiteUrl && (
        <p className="text-ink/40">No further details have been published yet.</p>
      )}
    </div>
  )
}

function Photo({ p }: { p: Party }) {
  return p.candidatePhotoUrl ? (
    <img src={p.candidatePhotoUrl} alt={p.candidateName} className="h-16 w-16 rounded-full object-cover" />
  ) : (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/10 text-lg font-semibold text-ink/50">
      {p.candidateName.slice(0, 1)}
    </div>
  )
}

export default function Candidates() {
  const { elections, loading, error } = useElectionData()
  const [compare, setCompare] = useState<Record<string, string[]>>({})

  function toggle(key: string, id: string) {
    setCompare((c) => {
      const cur = c[key] ?? []
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.slice(-1), id] // keep the latest two
      return { ...c, [key]: next }
    })
  }

  const withParties = elections.filter((e) => e.parties.length > 0)

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-2 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Candidates &amp; parties</h1>
      </div>
      <p className="mb-8 text-sm text-ink/60">
        Read about everyone standing before you vote. Tick “Compare” on two candidates in the same contest to see them
        side by side. Details are published by the election commission.
      </p>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : withParties.length === 0 ? (
        <p className="rounded-xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
          No candidates have been published yet. Check back once the commission adds them.
        </p>
      ) : (
        withParties.map((election) => {
          const contests = [...new Set(election.parties.map((p) => p.contest))]
          return (
            <section key={election.id} className="mb-12">
              <h2 className="font-serif text-xl font-semibold text-ink">{election.name}</h2>
              <p className="text-xs text-ink/50">
                Voting: {new Date(election.startsAt).toLocaleString()} – {new Date(election.endsAt).toLocaleString()}
              </p>

              {contests.map((contest) => {
                const key = `${election.id}::${contest}`
                const list = election.parties.filter((p) => p.contest === contest)
                const picked = (compare[key] ?? []).map((id) => list.find((p) => p.id === id)).filter(Boolean) as Party[]
                return (
                  <div key={key} className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{contest}</p>

                    {picked.length === 2 && (
                      <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-green-700/30 bg-green-700/5 p-4">
                        {picked.map((p) => (
                          <div key={p.id}>
                            <div className="flex items-center gap-3">
                              <Photo p={p} />
                              <div>
                                <p className="font-medium text-ink">{p.candidateName}</p>
                                <p className="text-xs text-ink/60">{p.name}</p>
                              </div>
                            </div>
                            <Detail p={p} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 space-y-3">
                      {list.map((p) => (
                        <article key={p.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-4">
                              <Photo p={p} />
                              <div>
                                <p className="font-serif text-lg font-semibold text-ink">{p.candidateName}</p>
                                <div className="mt-1 flex items-center gap-2 text-sm text-ink/70">
                                  <PartyBadge party={p.acronym} logoUrl={p.logoUrl} size="sm" />
                                  {p.name}
                                </div>
                              </div>
                            </div>
                            {list.length > 1 && (
                              <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink/70">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-green-700"
                                  checked={(compare[key] ?? []).includes(p.id)}
                                  onChange={() => toggle(key, p.id)}
                                />
                                Compare
                              </label>
                            )}
                          </div>
                          <Detail p={p} />
                        </article>
                      ))}
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })
      )}

      <p className="text-center text-sm text-ink/60">
        Ready to vote? <Link to="/dashboard" className="font-medium text-green-700">Go to your dashboard</Link>
      </p>
    </div>
  )
}
