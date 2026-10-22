import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import { startAuthentication } from '@simplewebauthn/browser'
import { voterFetch } from '../../lib/voterAuth'

const inputCls =
  'mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 tracking-widest text-ink outline-none focus:border-green-700 dark:border-paper/20 dark:text-paper'

export default function VoteLogin() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mfaMethod, setMfaMethod] = useState<'passkey' | 'totp' | null>(null)

  useEffect(() => {
    voterFetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setMfaMethod(d.voter?.mfaMethod ?? null))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const pvc = String(form.get('pvc') || '').trim()
    const nin = String(form.get('nin') || '').trim()
    const mfaCode = String(form.get('mfaCode') || '').trim()

    setSubmitting(true)
    try {
      let assertion: unknown
      if (mfaMethod === 'passkey') {
        const optRes = await voterFetch('/api/auth/vote-login/passkey-options', { method: 'POST' })
        const options = await optRes.json()
        if (!optRes.ok) {
          setError(options.message || 'Could not start the fingerprint / face check.')
          return
        }
        try {
          assertion = await startAuthentication({ optionsJSON: options })
        } catch (e) {
          const err = e as { name?: string; message?: string }
          setError(
            err.name === 'NotAllowedError'
              ? 'Cancelled or timed out. Try again and approve with your fingerprint, face or screen lock.'
              : `Could not use your passkey: ${err.message || err.name}`,
          )
          return
        }
      }
      const res = await voterFetch('/api/auth/vote-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pvc, nin, mfaCode: mfaCode || undefined, assertion }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not confirm your identity.')
        return
      }
      // Proof is required (with a fresh face capture) to mint the voting token.
      sessionStorage.setItem('naijavote_login_proof', data.loginProof)
      navigate('/vote/liveness')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9 text-green-700 dark:text-gold" />
        <p className="font-serif text-lg font-semibold text-ink dark:text-paper">Confirm it's you</p>
      </div>

      <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-ink/80 dark:text-paper/80">
        Your voter card and NIN unlock this step, but they don't cast your vote on their own —
        you'll also need a fresh face check next, every single time.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6 dark:border-paper/10 dark:bg-charcoal">
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="pvc" className="block text-sm font-medium text-ink dark:text-paper">
            Voter Card (PVC) number
          </label>
          <input id="pvc" name="pvc" type="text" required autoComplete="off" className={inputCls} />
        </div>
        <div>
          <label htmlFor="nin" className="block text-sm font-medium text-ink dark:text-paper">
            NIN
          </label>
          <input id="nin" name="nin" type="password" inputMode="numeric" maxLength={11} required autoComplete="off" className={inputCls} />
        </div>
        {mfaMethod === 'passkey' ? (
          <p className="rounded-lg bg-green-700/10 p-3 text-sm text-green-900">
            After you tap Continue, your phone will ask for your fingerprint, face or screen lock.
          </p>
        ) : (
          <div>
            <label htmlFor="mfaCode" className="block text-sm font-medium text-ink dark:text-paper">
              Authenticator code
            </label>
            <input id="mfaCode" name="mfaCode" inputMode="numeric" maxLength={6} autoComplete="one-time-code" className={inputCls} />
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {submitting ? 'Checking…' : 'Continue to face check'}
        </button>
      </form>
    </div>
  )
}
