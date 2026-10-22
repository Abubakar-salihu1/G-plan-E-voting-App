import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmblemLogo from '../components/EmblemLogo'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [devCode, setDevCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function post(path: string, body: unknown) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { res, data: await res.json().catch(() => ({})) }
  }

  async function requestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { res, data } = await post('/api/auth/password/forgot', { email })
      if (!res.ok) {
        setError(data.message || 'Could not send the code.')
        return
      }
      if (data.devOnlyCode) setDevCode(data.devOnlyCode)
      setNotice('If that email is registered, a 6-digit code is on its way. It lasts 15 minutes — check Spam too.')
      setStep('reset')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    setBusy(true)
    try {
      const { res, data } = await post('/api/auth/password/reset', {
        email,
        code: String(form.get('code') || ''),
        newPassword: String(form.get('newPassword') || ''),
      })
      if (!res.ok) {
        setError(data.message || 'Could not reset the password.')
        return
      }
      navigate('/login', { replace: true })
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700'
  const button = 'w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60'

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <p className="font-serif text-lg font-semibold text-ink">Reset your password</p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-6">
        {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        {step === 'email' ? (
          <form onSubmit={requestCode} className="space-y-4">
            <p className="text-sm text-ink/70">Enter the email you registered with. We'll send you a 6-digit code.</p>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">Email address</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </div>
            <button type="submit" disabled={busy} className={button}>{busy ? 'Sending…' : 'Send code'}</button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            {notice && <p className="rounded-lg bg-green-700/10 p-3 text-sm text-green-900">{notice}</p>}
            {devCode && (
              <p className="rounded-lg bg-gold/20 p-3 text-xs text-ink/80">
                No email service is connected, so for testing the code is: <strong>{devCode}</strong>
              </p>
            )}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-ink">6-digit code</label>
              <input id="code" name="code" inputMode="numeric" maxLength={6} required autoComplete="one-time-code" className={input + ' tracking-widest'} />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-ink">New password</label>
              <input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" className={input} />
              <p className="mt-1 text-xs text-ink/50">10+ characters, mixing upper/lowercase, a number, and a symbol.</p>
            </div>
            <button type="submit" disabled={busy} className={button}>{busy ? 'Saving…' : 'Change password'}</button>
            <button type="button" onClick={() => { setStep('email'); setError('') }} className="w-full text-sm font-medium text-green-700">Back</button>
          </form>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-ink/60">
        Remembered it? <Link to="/login" className="font-medium text-green-700">Sign in</Link>
      </p>
    </div>
  )
}
