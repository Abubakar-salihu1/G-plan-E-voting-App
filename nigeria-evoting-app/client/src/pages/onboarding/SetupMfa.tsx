import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import EmblemLogo from '../../components/EmblemLogo'
import OnboardingProgress from '../../components/OnboardingProgress'
import { voterFetch } from '../../lib/voterAuth'

type Enrol = { secret: string; otpauthUrl: string }
const JSON_HEADERS = { 'Content-Type': 'application/json' }

export default function SetupMfa() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'choose' | 'totp'>('choose')
  const [enrol, setEnrol] = useState<Enrol | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [saved, setSaved] = useState(false)
  const passkeysSupported = browserSupportsWebAuthn()

  function finishSetup(recoveryCodes?: string[]) {
    if (recoveryCodes && recoveryCodes.length) setCodes(recoveryCodes)
    else navigate('/verify/voter-card')
  }

  async function usePasskey() {
    setError('')
    setBusy(true)
    try {
      const optRes = await voterFetch('/api/auth/passkey/register/options', { method: 'POST' })
      const options = await optRes.json()
      if (optRes.status === 409) {
        navigate('/verify/voter-card') // already set up
        return
      }
      if (!optRes.ok) {
        setError(options.message || 'Could not start passkey setup.')
        return
      }
      let attestation
      try {
        attestation = await startRegistration({ optionsJSON: options })
      } catch (e) {
        const err = e as { name?: string; message?: string }
        setError(
          err.name === 'NotAllowedError'
            ? 'Cancelled or timed out. Tap the button and approve with your fingerprint, face or screen lock.'
            : `This phone could not create a passkey: ${err.message || err.name}`,
        )
        return
      }
      const res = await voterFetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ response: attestation }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError([data.message, data.detail].filter(Boolean).join(' — ') || 'Could not register this device.')
        return
      }
      finishSetup(data.recoveryCodes)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function startTotp() {
    setError('')
    setMode('totp')
    setBusy(true)
    try {
      const res = await voterFetch('/api/auth/mfa/setup', { method: 'POST' })
      const data = await res.json()
      if (res.status === 409) {
        navigate('/verify/voter-card')
        return
      }
      if (!res.ok) {
        setError(data.message || 'Could not start setup.')
        setMode('choose')
        return
      }
      setEnrol({ secret: data.secret, otpauthUrl: data.otpauthUrl })
    } catch {
      setError('Could not reach the server.')
      setMode('choose')
    } finally {
      setBusy(false)
    }
  }

  async function confirmTotp() {
    setError('')
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    setBusy(true)
    try {
      const res = await voterFetch('/api/auth/mfa/confirm', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not confirm the code.')
        return
      }
      finishSetup(data.recoveryCodes)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const primary =
    'w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60'

  if (codes) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-paper/10 dark:bg-charcoal">
          <p className="font-serif text-lg font-semibold text-ink dark:text-paper">Save your backup codes</p>
          <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">
            If you ever lose this phone, one of these codes lets you sign in and set up a new device. Each works
            once. They are shown <strong>only now</strong> — write them down or save them somewhere safe, and
            never share them.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-ink/5 p-4 font-mono text-sm tracking-wider text-ink dark:bg-paper/5 dark:text-paper">
            {codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}
            className="mt-3 text-sm font-medium text-green-700"
          >
            Copy all codes
          </button>
          <label className="mt-4 flex items-start gap-2 text-sm text-ink dark:text-paper">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1 h-4 w-4 accent-green-700" />
            I have saved these codes somewhere safe.
          </label>
          <button
            onClick={() => navigate('/verify/voter-card')}
            disabled={!saved}
            className="mt-5 w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9 text-green-700 dark:text-gold" />
        <p className="font-serif text-lg font-semibold text-ink dark:text-paper">Secure your account</p>
      </div>

      <OnboardingProgress current={4} />

      <div className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-paper/10 dark:bg-charcoal">
        {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

        {mode === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm text-ink/70 dark:text-paper/70">
              Choose how you'll prove it's you each time you sign in and vote. This step is required.
            </p>

            <div className="rounded-xl border border-green-700/30 bg-green-700/5 p-4">
              <p className="font-medium text-ink dark:text-paper">Fingerprint or face unlock (recommended)</p>
              <p className="mt-1 text-sm text-ink/60 dark:text-paper/60">
                Uses the lock on this phone. Nothing to type, and it can't be tricked by a fake website.
              </p>
              <button onClick={usePasskey} disabled={busy || !passkeysSupported} className={primary + ' mt-3'}>
                {busy ? 'Waiting for your phone…' : 'Use fingerprint / face'}
              </button>
              {!passkeysSupported && (
                <p className="mt-2 text-xs text-red-700">This browser doesn't support passkeys. Use the authenticator app below.</p>
              )}
            </div>

            <button
              onClick={startTotp}
              disabled={busy}
              className="w-full rounded-full border border-ink/20 py-2.5 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-60 dark:border-paper/20 dark:text-paper"
            >
              Use an authenticator app instead
            </button>
          </div>
        )}

        {mode === 'totp' && (
          <>
            <p className="text-sm text-ink/70 dark:text-paper/70">
              In Google Authenticator, Authy or similar, choose “Enter a setup key” and add this time-based key:
            </p>
            {enrol ? (
              <>
                <p className="mt-3 break-all rounded-lg bg-ink/5 p-3 font-mono text-sm tracking-wider text-ink dark:bg-paper/5 dark:text-paper">
                  {enrol.secret}
                </p>
                <label htmlFor="mfa-code" className="mt-4 block text-sm font-medium text-ink dark:text-paper">
                  Enter the 6-digit code to confirm
                </label>
                <input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 tracking-widest text-ink outline-none focus:border-green-700 dark:border-paper/20 dark:text-paper"
                />
              </>
            ) : (
              !error && <p className="mt-3 text-sm text-ink/60">Preparing your key…</p>
            )}
            <button onClick={confirmTotp} disabled={busy || !enrol} className={primary + ' mt-6'}>
              {busy ? 'Confirming…' : 'Confirm & continue'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
