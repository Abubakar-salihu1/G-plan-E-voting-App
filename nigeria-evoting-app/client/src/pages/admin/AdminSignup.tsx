import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'

export default function AdminSignup() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [revokedPrevious, setRevokedPrevious] = useState(0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const inviteCode = String(form.get('inviteCode') || '').trim()
    const password = String(form.get('newPassword') || '').trim()

    if (!inviteCode || !password) {
      setError('All fields are required to activate your account.')
      return
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not activate this invite.')
        return
      }
      setRevokedPrevious(data.revokedPreviousSuperAdmins || 0)
      setDone(true)
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <EmblemLogo className="mx-auto h-10 w-10" />
        <h1 className="mt-4 font-serif text-xl font-semibold text-ink">Account activated</h1>
        <p className="mt-3 text-ink/60">
          Your account is live in the database. Sign in with your new password — the
          authenticator-code field will accept any 6 digits until MFA enrollment is wired up.
        </p>
        {revokedPrevious > 0 && (
          <p className="mt-3 rounded-lg bg-gold/10 p-3 text-sm text-ink/80">
            As part of this activation, the previous super-admin account was automatically
            revoked — this is logged in the audit trail.
          </p>
        )}
        <button
          onClick={() => navigate('/admin/login')}
          className="mt-6 rounded-full bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-900"
        >
          Continue to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <div>
          <p className="font-serif text-lg font-semibold text-ink">Activate your commission account</p>
          <p className="text-xs text-ink/50">Chairman, Commissioner &amp; staff accounts are invite-only</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-ink/80">
        By design, nobody can open this page and register themselves as an admin — including as
        Chairman. A sitting super-admin issues a one-time invite code first, from{' '}
        <strong>Manage accounts &amp; access</strong>. This screen only <em>activates</em> that
        invite against the real database — it's rejected server-side if the code is missing,
        expired, or already used.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-ink">
            Invite code
          </label>
          <input
            id="inviteCode"
            name="inviteCode"
            type="text"
            required
            placeholder="Paste the code you were given"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-ink">
            Create password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {submitting ? 'Activating…' : 'Activate account'}
        </button>
      </form>
    </div>
  )
}
