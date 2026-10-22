import { useEffect, useState } from 'react'
import EmblemLogo from '../../components/EmblemLogo'
import Skeleton from '../../components/Skeleton'
import { adminFetch } from '../../lib/adminAuth'

type VoterRow = {
  id: string
  name: string
  pvc: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
}

export default function VoterRoll() {
  const [loading, setLoading] = useState(true)
  const [voters, setVoters] = useState<VoterRow[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const res = await adminFetch('/api/voters?status=all&limit=100')
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not load voters.')
      setVoters(
        data.voters
          .filter((v: { status: string }) => v.status !== 'incomplete')
          .map((v: { id: string; email: string; status: string; createdAt: string }) => ({
            id: v.id,
            name: v.email,
            pvc: 'on file (hashed)',
            submittedAt: new Date(v.createdAt).toLocaleDateString(),
            status: v.status === 'approved' ? 'approved' : 'pending',
          })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load voters.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function decide(id: string, status: 'approved' | 'rejected') {
    setError('')
    const res = await adminFetch(`/api/voters/${id}/verification`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: status === 'approved' ? 'approve' : 'reject' }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.message || 'Could not record that decision.')
      return
    }
    await load()
  }

  async function resetMfa(id: string, name: string) {
    setError('')
    setNotice('')
    if (!window.confirm(`Reset MFA for ${name}? Only do this after confirming who they are outside the app. This is logged.`)) return
    const res = await adminFetch(`/api/voters/${id}/reset-mfa`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.message || 'Could not reset MFA (super-admin only).')
      return
    }
    setNotice(data.message)
  }

  const pending = voters.filter((v) => v.status === 'pending')
  const decided = voters.filter((v) => v.status !== 'pending')

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9 text-green-700 dark:text-gold" />
        <h1 className="font-serif text-2xl font-semibold text-ink dark:text-paper">
          Voter roll &amp; verification queue
        </h1>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded-lg bg-green-700/10 p-3 text-sm text-green-900">{notice}</p>}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
      <h2 className="font-serif text-lg font-semibold text-ink dark:text-paper">
        Pending review ({pending.length})
      </h2>
      <div className="mt-3 space-y-3">
        {pending.length === 0 && (
          <p className="text-sm text-ink/50 dark:text-paper/50">Nothing waiting on you right now.</p>
        )}
        {pending.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4 dark:border-paper/10 dark:bg-charcoal"
          >
            <div>
              <p className="font-medium text-ink dark:text-paper">{v.name}</p>
              <p className="text-xs text-ink/50 dark:text-paper/50">
                Voter card {v.pvc} · NIN, voter card &amp; face check submitted · joined {v.submittedAt}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => decide(v.id, 'rejected')}
                className="rounded-full border border-red-600/40 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-600/10"
              >
                Reject
              </button>
              <button
                onClick={() => decide(v.id, 'approved')}
                className="rounded-full bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-900"
              >
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink dark:text-paper">
        Decided
      </h2>
      <div className="mt-3 space-y-2">
        {decided.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-3 text-sm dark:border-paper/10 dark:bg-charcoal"
          >
            <span className="text-ink dark:text-paper">{v.name}</span>
            <button
              onClick={() => resetMfa(v.id, v.name)}
              className="rounded-full border border-ink/20 px-2.5 py-0.5 text-xs text-ink/70 hover:bg-ink/5 dark:border-paper/20 dark:text-paper/70"
            >
              Reset MFA
            </button>
            <span
              className={
                v.status === 'approved'
                  ? 'rounded-full bg-green-700/10 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-gold/10 dark:text-gold'
                  : 'rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-medium text-red-600'
              }
            >
              {v.status === 'approved' ? 'Approved' : 'Rejected'}
            </span>
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  )
}
