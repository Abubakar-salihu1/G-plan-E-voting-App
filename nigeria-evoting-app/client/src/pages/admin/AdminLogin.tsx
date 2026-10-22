import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import { setAdminToken } from '../../lib/adminAuth'

type Setup = { setupToken: string; secret: string; otpauthUrl: string }

const inputCls =
  'mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700'

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [setup, setSetup] = useState<Setup | null>(null)

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const identifier = String(form.get('staffId') || '').trim()
    const password = String(form.get('password') || '')
    const mfaCode = String(form.get('mfaCode') || '').trim()

    if (!identifier || !password) {
      setError('Enter your staff ID or email and your password.')
      return
    }

    setSubmitting(true)
    try {
      const { res, data } = await post('/api/admin/login', { identifier, password, mfaCode: mfaCode || undefined })
      if (!res.ok) {
        setError(data.message || 'Sign-in failed.')
        return
      }
      if (data.mfaSetupRequired) {
        // First sign-in: this account has no authenticator yet — enrol one now.
        const s = await post('/api/admin/mfa/setup', { setupToken: data.setupToken })
        if (!s.res.ok) {
          setError(s.data.message || 'Could not start authenticator setup.')
          return
        }
        setSetup({ setupToken: data.setupToken, secret: s.data.secret, otpauthUrl: s.data.otpauthUrl })
        return
      }
      setAdminToken(data.token)
      navigate('/admin/dashboard')
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmSetup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!setup) return
    setError('')
    const code = String(new FormData(e.currentTarget).get('code') || '').trim()
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    setSubmitting(true)
    try {
      const { res, data } = await post('/api/admin/mfa/confirm', { setupToken: setup.setupToken, code })
      if (!res.ok) {
        setError(data.message || 'Could not confirm the code.')
        return
      }
      setAdminToken(data.token)
      navigate('/admin/dashboard')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <div>
          <p className="font-serif text-lg font-semibold text-ink">Commission Admin Portal</p>
          <p className="text-xs text-ink/50">For INEC Chairman, Commissioners &amp; authorised staff only</p>
        </div>
      </div>

      {setup ? (
        <form onSubmit={handleConfirmSetup} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
          <p className="font-medium text-ink">Set up your authenticator app</p>
          <p className="text-sm text-ink/70">
            Multi-factor authentication is mandatory for admin accounts. In Google Authenticator, Authy or
            similar, choose “Enter a setup key” and add this key (time-based):
          </p>
          <p className="break-all rounded-lg bg-ink/5 p-3 font-mono text-sm tracking-wider text-ink">
            {setup.secret}
          </p>
          <details className="text-xs text-ink/50">
            <summary className="cursor-pointer">Use a QR-capable app instead</summary>
            <p className="mt-2 break-all font-mono">{setup.otpauthUrl}</p>
          </details>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-ink">
              6-digit code from the app
            </label>
            <input id="code" name="code" inputMode="numeric" maxLength={6} required autoComplete="one-time-code" className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
          >
            {submitting ? 'Confirming…' : 'Confirm & sign in'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignIn} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
          <div>
            <label htmlFor="staffId" className="block text-sm font-medium text-ink">
              Staff ID or official email
            </label>
            <input id="staffId" name="staffId" type="text" required autoComplete="username" className={inputCls} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className={inputCls} />
          </div>
          <div>
            <label htmlFor="mfaCode" className="block text-sm font-medium text-ink">
              Authenticator code
            </label>
            <input
              id="mfaCode"
              name="mfaCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="6-digit code"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-ink/45">
              First time signing in? Leave this blank — you’ll be walked through setting up your
              authenticator after your password is checked.
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-ink/60">
        New commission staff need an invitation.{' '}
        <Link to="/admin/signup" className="font-medium text-green-700">
          Activate an invite
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink/60">
        Super-admin?{' '}
        <Link to="/admin/manage" className="font-medium text-green-700">
          Manage accounts &amp; access
        </Link>
      </p>
    </div>
  )
}
