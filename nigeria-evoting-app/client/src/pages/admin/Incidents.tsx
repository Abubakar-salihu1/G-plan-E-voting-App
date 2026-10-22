import { useEffect, useState } from 'react'
import EmblemLogo from '../../components/EmblemLogo'
import Skeleton from '../../components/Skeleton'
import { adminFetch } from '../../lib/adminAuth'

type Incident = {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'resolved'
  reportedAt: string
}

const severityStyle: Record<Incident['severity'], string> = {
  low: 'bg-ink/10 text-ink/60 dark:bg-paper/10 dark:text-paper/60',
  medium: 'bg-gold/20 text-gold-600 dark:bg-gold/20 dark:text-gold',
  high: 'bg-red-600/10 text-red-600',
}

export default function Incidents() {
  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await adminFetch('/api/incidents')
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not load incidents.')
      setIncidents(data.incidents)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load incidents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function addIncident(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError('')
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.message || 'Could not log that incident.')
      return
    }
    setTitle('')
    await load()
  }

  async function resolve(id: string) {
    const res = await adminFetch(`/api/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })
    if (res.ok) await load()
    else setError('Could not update that incident.')
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9 text-green-700 dark:text-gold" />
        <h1 className="font-serif text-2xl font-semibold text-ink dark:text-paper">
          Incident management
        </h1>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      <form
        onSubmit={addIncident}
        className="flex gap-3 rounded-2xl border border-ink/10 bg-white p-4 dark:border-paper/10 dark:bg-charcoal"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Log a new incident…"
          className="flex-1 rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700 dark:border-paper/20 dark:text-paper"
        />
        <button
          type="submit"
          className="rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-900"
        >
          Log
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {loading && (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        )}
        {!loading && incidents.map((i) => (
          <div
            key={i.id}
            className="rounded-xl border border-ink/10 bg-white p-4 dark:border-paper/10 dark:bg-charcoal"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink dark:text-paper">{i.title}</p>
                <p className="text-xs text-ink/50 dark:text-paper/50">Reported {new Date(i.reportedAt).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityStyle[i.severity]}`}>
                {i.severity}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span
                className={
                  i.status === 'open'
                    ? 'text-xs font-medium text-gold-600 dark:text-gold'
                    : 'text-xs font-medium text-green-700 dark:text-green-500'
                }
              >
                {i.status === 'open' ? 'Open' : 'Resolved'}
              </span>
              {i.status === 'open' && (
                <button
                  onClick={() => resolve(i.id)}
                  className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink dark:border-paper/30 dark:text-paper"
                >
                  Mark resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
