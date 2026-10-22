import { useState } from 'react'
import { voterFetch } from '../lib/voterAuth'

// Lets a signed-in voter replace their backup codes (the old ones stop working).
export default function BackupCodes() {
  const [codes, setCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!window.confirm('Make 8 new backup codes? Your old codes will stop working.')) return
    setBusy(true)
    setError('')
    try {
      const res = await voterFetch('/api/auth/recovery-codes', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not make new codes.')
        return
      }
      setCodes(data.recoveryCodes)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:col-span-2">
      <p className="text-sm font-medium text-ink/60">Backup codes</p>
      <p className="mt-1 text-xs text-ink/50">
        One-time codes that let you back in if you lose your phone. Save them somewhere safe; they are shown only once.
      </p>
      {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
      {codes ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-ink/5 p-4 font-mono text-sm tracking-wider text-ink">
            {codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <button type="button" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))} className="mt-2 text-sm font-medium text-green-700">
            Copy all codes
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="mt-3 rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
        >
          {busy ? 'Working…' : 'Make new backup codes'}
        </button>
      )}
    </div>
  )
}
