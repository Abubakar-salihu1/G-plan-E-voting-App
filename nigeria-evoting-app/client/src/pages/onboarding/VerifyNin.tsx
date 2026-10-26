import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import OnboardingProgress from '../../components/OnboardingProgress'
import { voterFetch } from '../../lib/voterAuth'

export default function VerifyNin() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const nin = String(new FormData(e.currentTarget).get('nin') || '').trim()

    setSubmitting(true)
    try {
      const res = await voterFetch('/api/auth/verify-nin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not verify NIN.')
        return
      }
      navigate('/verify/otp')
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
        <p className="font-serif text-lg font-semibold text-ink">Verify your NIN</p>
      </div>

      <OnboardingProgress current={2} />

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="nin" className="block text-sm font-medium text-ink">
            National Identification Number (NIN)
          </label>
          <input
            id="nin"
            name="nin"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{11}"
            maxLength={11}
            required
            placeholder="11-digit NIN"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 tracking-widest text-ink outline-none focus:border-green-700"
          />
          <p className="mt-1 text-xs text-ink/45">
            Checked for duplicates and hashed for real. There's no live national identity database
            to call in this prototype, so any valid 11-digit number is accepted — but it's never stored
            as plain text, and can't be reused to open a second account.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {submitting ? 'Verifying…' : 'Verify NIN'}
        </button>
      </form>
    </div>
  )
}
