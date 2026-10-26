import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import OnboardingProgress from '../../components/OnboardingProgress'
import { voterFetch } from '../../lib/voterAuth'

export default function VerifyOtp() {
  const navigate = useNavigate()
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState('')
  const [requesting, setRequesting] = useState(false)
  const didRequest = useRef(false)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [devCode, setDevCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  async function requestCode() {
    if (requesting) return
    setError('')
    setNotice('')
    setRequesting(true)
    try {
      const res = await voterFetch('/api/auth/otp/request', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.devOnlyCode) setDevCode(data.devOnlyCode)
        setSeconds(data.retryAfter ?? 60)
        setNotice(
          data.devOnlyCode
            ? 'Your code is shown below.'
            : data.sent
            ? `Code sent${data.to ? ` to ${data.to}` : ''}. It can take up to a minute — check Spam too.`
            : `A code was already sent${data.to ? ` to ${data.to}` : ''}. Check your inbox and Spam.`,
        )
      } else {
        if (res.status === 429) setSeconds(Number(res.headers.get('Retry-After')) || 60)
        setError(data.message || 'Could not send a code.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setRequesting(false)
    }
  }

  useEffect(() => {
    // React dev mode runs effects twice; this guard makes sure only ONE code is requested.
    if (didRequest.current) return
    didRequest.current = true
    requestCode()
  }, [])

  useEffect(() => {
    if (seconds === 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  function handleDigitChange(i: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[i] = value
    setDigits(next)
    if (value && i < 5) inputRefs.current[i + 1]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const code = digits.join('')
    if (code.length !== 6) {
      setError('Enter all 6 digits.')
      return
    }

    setSubmitting(true)
    try {
      const res = await voterFetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not verify code.')
        return
      }
      navigate('/verify/mfa')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <p className="font-serif text-lg font-semibold text-ink">Enter your OTP</p>
      </div>

      <OnboardingProgress current={3} />

      {devCode && (
        <div className="mb-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-ink/80">
          Email isn't available on this prototype, so your code is shown here instead:{' '}
          <span className="font-mono font-semibold">{devCode}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        {notice && !error && <p className="rounded-lg bg-green-700/10 p-3 text-sm text-green-900">{notice}</p>}
        <p className="text-sm text-ink/70">
          Enter the 6-digit code we emailed you. It expires in 5 minutes.
        </p>
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              required
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              className="h-12 w-12 rounded-lg border border-ink/15 bg-transparent text-center text-lg text-ink outline-none focus:border-green-700"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {submitting ? 'Verifying…' : 'Verify code'}
        </button>

        <p className="text-center text-sm text-ink/60">
          {seconds > 0 ? (
            <>Resend code in {seconds}s</>
          ) : (
            <button type="button" onClick={requestCode} disabled={requesting} className="font-medium text-green-700 disabled:opacity-60">
              {requesting ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </p>
      </form>
    </div>
  )
}
