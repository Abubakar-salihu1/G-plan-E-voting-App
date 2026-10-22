import { useEffect, useState } from 'react'
import EmblemLogo from '../../components/EmblemLogo'
import Skeleton from '../../components/Skeleton'
import { adminFetch } from '../../lib/adminAuth'

type Entry = { id: string; seq: number; actor: string; action: string; hash: string; createdAt: string }
type Chain = { valid: boolean; entries: number; brokenAtSeq?: number }

const fmt = (iso: string) => new Date(iso).toLocaleString()

export default function AuditLog() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [chain, setChain] = useState<Chain | null>(null)
  const [error, setError] = useState('')
  const limit = 50

  useEffect(() => {
    setLoading(true)
    adminFetch(`/api/audit-log?page=${page}&limit=${limit}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Could not load the audit log.')
        setEntries(data.entries)
        setTotal(data.total)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page])

  async function verifyChain() {
    setChain(null)
    const res = await adminFetch('/api/audit-log/verify')
    if (res.ok) setChain(await res.json())
  }

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = [['seq', 'time', 'actor', 'action', 'hash'], ...entries.map((e) => [e.seq, e.createdAt, e.actor, e.action, e.hash])]
    const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit-log-page-${page}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9 text-green-700 dark:text-gold" />
        <h1 className="font-serif text-2xl font-semibold text-ink dark:text-paper">Audit log</h1>
      </div>

      <p className="mb-6 text-sm text-ink/60 dark:text-paper/60">
        Append-only and hash-chained — each entry carries a hash of the entry before it, so
        removing or editing a past entry breaks every hash after it. Read-only, including for
        admins.
      </p>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-ink/10 dark:border-paper/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink/5 text-ink/60 dark:bg-paper/5 dark:text-paper/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 dark:divide-paper/10">
                {entries.map((e) => (
                  <tr key={e.id} className="bg-white dark:bg-charcoal">
                    <td className="px-4 py-3 font-mono text-xs text-ink/60 dark:text-paper/60">{fmt(e.createdAt)}</td>
                    <td className="px-4 py-3 text-ink/80 dark:text-paper/80">{e.actor}</td>
                    <td className="px-4 py-3 text-ink dark:text-paper">{e.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entries.length === 0 && <p className="mt-4 text-sm text-ink/50">No entries yet.</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={exportCsv} className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink dark:border-paper/30 dark:text-paper">
              Export this page as CSV
            </button>
            <button onClick={verifyChain} className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink dark:border-paper/30 dark:text-paper">
              Verify hash chain
            </button>
            {chain && (
              <span className={chain.valid ? 'text-sm font-medium text-green-700' : 'text-sm font-medium text-red-600'}>
                {chain.valid ? `Chain intact (${chain.entries} entries)` : `Chain BROKEN at entry #${chain.brokenAtSeq}`}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-ink/60">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">← Newer</button>
            <span>Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
            <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">Older →</button>
          </div>
        </>
      )}
    </div>
  )
}
