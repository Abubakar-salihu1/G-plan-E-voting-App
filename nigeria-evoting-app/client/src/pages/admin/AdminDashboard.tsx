import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import { adminFetch, signOutAdmin } from '../../lib/adminAuth'
import { useElectionData } from '../../lib/store'

const cards = [
  {
    to: '/admin/elections',
    title: 'Election setup & scheduling',
    body: 'Create an election, set the voting window (start/end date-time, timezone), and lock date.',
  },
  {
    to: '/admin/parties',
    title: 'Party & candidate onboarding',
    body: 'Upload parties with logos, and assign candidates to a contest before the roster locks.',
  },
  {
    to: '/admin/voters',
    title: 'Voter roll & verification',
    body: 'Review and approve or reject pending NIN/voter-card/face verifications.',
  },
  {
    to: '/admin/incidents',
    title: 'Incident management',
    body: 'Log, track, and resolve reported incidents — including ones submitted publicly.',
  },
  {
    to: '/admin/notifications',
    title: 'Notification broadcast',
    body: 'Send updates to all verified voters, staff, or unverified accounts.',
  },
  {
    to: '/admin/audit-log',
    title: 'Audit log',
    body: 'Read-only, tamper-evident record of every admin and system action.',
  },
  {
    to: '/admin/manage',
    title: 'Manage accounts & access',
    body: 'Revoke an outgoing official\u2019s access and invite their replacement.',
  },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { elections } = useElectionData()

  const [counts, setCounts] = useState<{ registered: number; verified: number; pendingReview: number; votesCast: number } | null>(null)
  useEffect(() => {
    adminFetch('/api/voters/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then(setCounts)
      .catch(() => {})
  }, [])
  const show = (n?: number) => (n === undefined ? '—' : String(n))

  const stats = [
    { label: 'Registered voters', value: show(counts?.registered) },
    { label: 'Verified voters', value: show(counts?.verified) },
    { label: 'Waiting for review', value: show(counts?.pendingReview) },
    { label: 'Votes cast', value: show(counts?.votesCast) },
    { label: 'Elections configured', value: String(elections.length) },
    { label: 'Open incidents', value: '0' },
  ]

  function handleSignOut() {
    signOutAdmin()
    navigate('/admin/login')
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <EmblemLogo className="h-9 w-9" />
          <div>
            <h1 className="font-serif text-2xl font-semibold text-ink">Commission admin dashboard</h1>
            <p className="text-sm text-ink/60">System overview</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink hover:border-ink/40"
        >
          Sign out
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-ink/10 bg-white p-4">
            <p className="font-serif text-2xl font-semibold text-ink">{s.value}</p>
            <p className="text-xs text-ink/50">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">Set up an election</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-2xl border border-ink/10 bg-white p-5 transition hover:border-green-700/40"
          >
            <p className="font-semibold text-ink">{c.title}</p>
            <p className="mt-2 text-sm text-ink/60">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
