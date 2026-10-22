import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'

export default function VoteReceipt() {
  const [checked, setChecked] = useState(false)
  const [code, setCode] = useState('')

  useEffect(() => {
    // Random per-submission code issued by the server. It is stored only as a
    // keyed hash, unlinked to any ballot, so it can confirm your submission was
    // recorded without revealing who you voted for.
    setCode(sessionStorage.getItem('naijavote_receipt') || '')
    sessionStorage.removeItem('naijavote_receipt')
    setChecked(true)
  }, [])

  if (!checked) return null
  // Arriving here with no receipt means the submission step was skipped —
  // send them back rather than showing a blank/fake confirmation.
  if (!code) return <Navigate to="/dashboard" replace />

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <EmblemLogo className="mx-auto h-12 w-12" />
      <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">
        Your votes were recorded
      </h1>
      <p className="mt-3 text-ink/70">
        Keep this reference code. It proves you voted in every contest on your ballot — it never
        reveals who you voted for.
      </p>

      <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 font-mono text-2xl tracking-widest text-green-700">
        {code}
      </div>

      <Link
        to="/dashboard"
        className="mt-8 inline-block rounded-full bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-900"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
