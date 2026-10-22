import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import EmblemLogo from '../components/EmblemLogo'
import { startAuthentication } from '@simplewebauthn/browser'
import { setVoterToken } from '../lib/voterAuth'

type Voter = {
  verified?: boolean
  mfaEnabled?: boolean
  otpVerified?: boolean
  hasNin?: boolean
  hasPvc?: boolean
  hasFace?: boolean
}

// Sends a voter to the first sign-up step they have not finished yet.
function nextRoute(v?: Voter) {
  if (!v) return '/dashboard'
  if (v.verified) return v.mfaEnabled === false ? '/verify/mfa' : '/dashboard'
  if (!v.hasNin) return '/verify/nin'
  if (!v.otpVerified) return '/verify/otp'
  if (!v.mfaEnabled) return '/verify/mfa'
  if (!v.hasPvc) return '/verify/voter-card'
  if (!v.hasFace) return '/verify/face'
  return '/dashboard'
}

export default function SignIn() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mfaToken, setMfaToken] = useState('') // set after the password step when MFA is required
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [method, setMethod] = useState<'totp' | 'passkey'>('totp')

  function finish(token: string, voter?: Voter) {
    setVoterToken(token)
    navigate(nextRoute(voter))
  }

  async function post(path: string, body: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { res, data }
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')

    setSubmitting(true)
    try {
      const { res, data } = await post('/api/auth/login', { email, password })
      if (!res.ok) {
        setError(data.message || 'Sign-in failed.')
        return
      }
      if (data.mfaRequired) {
        setMethod(data.method === 'passkey' ? 'passkey' : 'totp')
        setMfaToken(data.mfaToken)
        return
      }
      finish(data.token, data.voter)
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMfa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const code = String(new FormData(e.currentTarget).get('code') || '').replace(/\D/g, '')
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    setSubmitting(true)
    try {
      const { res, data } = await post('/api/auth/login/mfa', { mfaToken, code })
      if (!res.ok) {
        setError(data.message || 'Sign-in failed.')
        if (data.restart) setMfaToken('')
        return
      }
      finish(data.token, data.voter)
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasskey() {
    setError('')
    setSubmitting(true)
    try {
      const { res: optRes, data: options } = await post('/api/auth/login/passkey-options', { mfaToken })
      if (!optRes.ok) {
        setError(options.message || 'Could not start the fingerprint / face check.')
        if (options.restart) setMfaToken('')
        return
      }
      let assertion
      try {
        assertion = await startAuthentication({ optionsJSON: options })
      } catch (e) {
        const err = e as { name?: string; message?: string }
        setError(
          err.name === 'NotAllowedError'
            ? 'Cancelled or timed out. Tap the button and approve with your fingerprint, face or screen lock.'
            : `Could not use your passkey: ${err.message || err.name}`,
        )
        return
      }
      const { res, data } = await post('/api/auth/login/mfa', { mfaToken, assertion })
      if (!res.ok) {
        setError([data.message, data.detail].filter(Boolean).join(' — ') || 'Sign-in failed.')
        if (data.restart) setMfaToken('')
        return
      }
      finish(data.token, data.voter)
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecovery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const recoveryCode = String(new FormData(e.currentTarget).get('recoveryCode') || '').trim()
    setSubmitting(true)
    try {
      const { res, data } = await post('/api/auth/login/recovery', { mfaToken, recoveryCode })
      if (!res.ok) {
        setError(data.message || 'Sign-in failed.')
        if (data.restart) {
          setMfaToken('')
          setRecoveryMode(false)
        }
        return
      }
      finish(data.token, data.voter) // MFA was reset, so this sends the voter to set it up again
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  const recoveryLink = (
    <button
      type="button"
      onClick={() => {
        setError('')
        setRecoveryMode(true)
      }}
      className="w-full text-sm font-medium text-ink/60 underline"
    >
      Lost your phone? Use a backup code
    </button>
  )

  const input =
    'mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700'
  const button =
    'w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60'

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <p className="font-serif text-lg font-semibold text-ink">Sign in</p>
      </div>

      {mfaToken && recoveryMode ? (
        <form onSubmit={handleRecovery} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
          <p className="text-sm text-ink/70">
            Enter one of the backup codes you saved when you set up your account. Signing in this way removes your
            old phone, and you'll set up your new one next.
          </p>
          <div>
            <label htmlFor="recoveryCode" className="block text-sm font-medium text-ink">
              Backup code
            </label>
            <input
              id="recoveryCode"
              name="recoveryCode"
              required
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="XXXXX-XXXXX"
              className={input + ' tracking-widest'}
            />
          </div>
          <button type="submit" disabled={submitting} className={button}>
            {submitting ? 'Checking…' : 'Sign in with backup code'}
          </button>
          <button type="button" onClick={() => setRecoveryMode(false)} className="w-full text-sm font-medium text-green-700">
            Back
          </button>
        </form>
      ) : !mfaToken ? (
        <form onSubmit={handlePassword} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink">
              Email address
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={input} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={input}
            />
          </div>
          <button type="submit" disabled={submitting} className={button}>
            {submitting ? 'Checking…' : 'Continue'}
          </button>
          <p className="text-center text-sm">
            <Link to="/forgot-password" className="font-medium text-green-700">
              Forgot your password?
            </Link>
          </p>
        </form>
      ) : (
        method === 'passkey' ? (
          <div className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
            {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
            <p className="text-sm text-ink/70">
              Password accepted. Now confirm it's you with the fingerprint, face or screen lock on this phone.
            </p>
            <button type="button" onClick={handlePasskey} disabled={submitting} className={button}>
              {submitting ? 'Waiting for your phone…' : 'Verify with fingerprint / face'}
            </button>
            {recoveryLink}
            <button
              type="button"
              onClick={() => {
                setMfaToken('')
                setError('')
              }}
              className="w-full text-sm font-medium text-green-700"
            >
              Back
            </button>
          </div>
        ) : (
        <form onSubmit={handleMfa} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
          <p className="text-sm text-ink/70">
            Password accepted. Open your authenticator app and enter the 6-digit code for NaijaVote.
          </p>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-ink">
              6-digit code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              className={input + ' tracking-widest'}
            />
          </div>
          <button type="submit" disabled={submitting} className={button}>
            {submitting ? 'Verifying…' : 'Sign in'}
          </button>
          {recoveryLink}
          <button
            type="button"
            onClick={() => {
              setMfaToken('')
              setError('')
            }}
            className="w-full text-sm font-medium text-green-700"
          >
            Back
          </button>
        </form>
        )
      )}

      <p className="mt-5 text-center text-sm text-ink/60">
        New here?{' '}
        <Link to="/signup" className="font-medium text-green-700">
          Register to vote
        </Link>
      </p>
    </div>
  )
}
