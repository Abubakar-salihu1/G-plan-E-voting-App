import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import OnboardingProgress from '../../components/OnboardingProgress'
import { setVoterToken } from '../../lib/voterAuth'

function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score // 0-4
}

const strengthLabel = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong']
const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-600', 'bg-green-700']

export default function SignUp() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const score = passwordStrength(password)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '').trim()

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not create your account.')
        return
      }
      setVoterToken(data.token)
      navigate('/verify/nin')
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <p className="font-serif text-lg font-semibold text-ink">Create your voter account</p>
      </div>

      <OnboardingProgress current={1} />

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
          />
          <p className="mt-1 text-xs text-ink/45">This becomes your sign-in username.</p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink">
            Create a password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex h-1.5 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-full flex-1 rounded-full ${i < score ? strengthColor[score] : 'bg-ink/10'}`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-ink/50">{strengthLabel[score]}</p>
            </div>
          )}
          <p className="mt-1 text-xs text-ink/45">
            10+ characters, mixing upper/lowercase, a number, and a symbol.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Continue'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink/60">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-green-700">
          Sign in
        </Link>
      </p>
    </div>
  )
}
