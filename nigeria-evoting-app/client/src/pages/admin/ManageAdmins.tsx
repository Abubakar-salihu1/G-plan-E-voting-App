import { useEffect, useState } from 'react'
import EmblemLogo from '../../components/EmblemLogo'
import { adminFetch } from '../../lib/adminAuth'

type AdminAccount = {
  id: string
  email: string
  staffId: string | null
  role: string
  active: boolean
  createdAt: string
}

const roles = ['staff', 'commissioner', 'chairman', 'super-admin']

export default function ManageAdmins() {
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteEmailed, setInviteEmailed] = useState(false)
  const [inviteRole, setInviteRole] = useState(roles[0])
  const [issuedCode, setIssuedCode] = useState('')
  const [issuing, setIssuing] = useState(false)

  async function loadAdmins() {
    setLoading(true)
    setError('')
    try {
      const res = await adminFetch('/api/admin')
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not load admin accounts.')
        return
      }
      setAdmins(data.admins)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  async function issueInvite(e: React.FormEvent) {
    e.preventDefault()
    setIssuing(true)
    setIssuedCode('')
    setInviteEmailed(false)
    setError('')
    try {
      const res = await adminFetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not issue invite.')
        return
      }
      setIssuedCode(data.code ?? '')
      setInviteEmailed(!!data.emailed)
      setInviteEmail('')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setIssuing(false)
    }
  }

  async function revoke(id: string) {
    try {
      const res = await adminFetch(`/api/admin/${id}/revoke`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Could not revoke access.')
        return
      }
      loadAdmins()
    } catch {
      setError('Could not reach the server.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <div>
          <p className="font-serif text-lg font-semibold text-ink">Manage commission accounts</p>
          <p className="text-xs text-ink/50">Super-admin only</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-ink/80">
        When a role changes hands — a new Chairman is sworn in, a Commissioner's term ends, a
        staff member is reassigned — revoke the outgoing holder's account here <em>first</em>,
        then issue a fresh invite for the incoming official below.
      </div>

      <form
        onSubmit={issueInvite}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-ink/10 bg-white p-5"
      >
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="inviteEmail" className="block text-sm font-medium text-ink">
            Official's email
          </label>
          <input
            id="inviteEmail"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="name@inec.gov.ng"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
          />
        </div>
        <div>
          <label htmlFor="inviteRole" className="block text-sm font-medium text-ink">
            Role
          </label>
          <select
            id="inviteRole"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="mt-1 rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={issuing}
          className="rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {issuing ? 'Issuing…' : 'Issue invite'}
        </button>

        {inviteRole === 'super-admin' && (
          <p className="w-full text-xs text-red-600">
            There's only ever one active super-admin — the moment this invite is activated, the
            current super-admin account is automatically revoked.
          </p>
        )}

        {inviteEmailed && (
          <div className="w-full rounded-lg bg-green-700/10 p-3 text-sm text-ink">
            Invite sent by email. Ask them to check their inbox (and spam folder).
          </div>
        )}

        {issuedCode && (
          <div className="w-full rounded-lg bg-green-700/10 p-3 text-sm text-ink">
            Invite code (in a real build this is emailed, not shown here):{' '}
            <code className="font-mono font-semibold">{issuedCode}</code>
          </div>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl border border-ink/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/5 text-ink/60">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-ink/50">Loading…</td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-ink/50">No admin accounts yet.</td></tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="bg-white">
                  <td className="px-4 py-3 text-ink">{admin.email}</td>
                  <td className="px-4 py-3 text-ink/80">{admin.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        admin.active
                          ? 'rounded-full bg-green-700/10 px-2.5 py-0.5 text-xs font-medium text-green-700'
                          : 'rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-medium text-ink/50'
                      }
                    >
                      {admin.active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {admin.active && (
                      <button
                        onClick={() => revoke(admin.id)}
                        className="rounded-full border border-red-600/40 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-600/10"
                      >
                        Revoke access
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
