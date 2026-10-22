import { useEffect, useState } from 'react'
import EmblemLogo from '../../components/EmblemLogo'
import { adminFetch } from '../../lib/adminAuth'

type Sent = { id: string; title: string; audience: string; sentAt: string }

export default function Notifications() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('All verified voters')
  const [history, setHistory] = useState<Sent[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    const res = await adminFetch('/api/notifications')
    if (res.ok) setHistory((await res.json()).notifications)
  }

  useEffect(() => {
    load()
  }, [])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError('')
    setNotice('')
    const res = await adminFetch('/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, audience }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.message || 'Could not send the broadcast.')
      return
    }
    setNotice(`Recorded for ${data.recipients} recipient(s). No email/SMS provider is connected yet, so nothing was delivered.`)
    setTitle('')
    setMessage('')
    await load()
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9 text-green-700 dark:text-gold" />
        <h1 className="font-serif text-2xl font-semibold text-ink dark:text-paper">
          Notification broadcast centre
        </h1>
      </div>

      <form
        onSubmit={send}
        className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6 dark:border-paper/10 dark:bg-charcoal"
      >
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-lg bg-gold/10 p-3 text-sm text-ink/80 dark:text-paper/80">{notice}</p>}
        <div>
          <label htmlFor="ntitle" className="block text-sm font-medium text-ink dark:text-paper">
            Title
          </label>
          <input
            id="ntitle"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700 dark:border-paper/20 dark:text-paper"
          />
        </div>
        <div>
          <label htmlFor="nmessage" className="block text-sm font-medium text-ink dark:text-paper">
            Message
          </label>
          <textarea
            id="nmessage"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700 dark:border-paper/20 dark:text-paper"
          />
        </div>
        <div>
          <label htmlFor="audience" className="block text-sm font-medium text-ink dark:text-paper">
            Audience
          </label>
          <select
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700 dark:border-paper/20 dark:text-paper"
          >
            <option>All verified voters</option>
            <option>All admins &amp; staff</option>
            <option>Unverified accounts</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-green-700 px-6 py-2.5 font-semibold text-white hover:bg-green-900"
        >
          Send broadcast
        </button>
      </form>

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink dark:text-paper">
        Recently sent
      </h2>
      <div className="mt-3 space-y-2">
        {history.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-3 text-sm dark:border-paper/10 dark:bg-charcoal"
          >
            <div>
              <p className="text-ink dark:text-paper">{h.title}</p>
              <p className="text-xs text-ink/45 dark:text-paper/45">{h.audience}</p>
            </div>
            <span className="text-xs text-ink/40 dark:text-paper/40">{new Date(h.sentAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
