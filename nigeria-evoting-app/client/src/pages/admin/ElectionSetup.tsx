import { useState } from 'react'
import EmblemLogo from '../../components/EmblemLogo'
import { useElectionData, ElectionLevel } from '../../lib/store'

// `id` is what the server needs; `label` is only for display.
const timezones = [{ id: 'Africa/Lagos', label: 'Africa/Lagos (WAT, UTC+1)' }]

const levelOptions: { value: ElectionLevel; label: string; hint: string }[] = [
  { value: 'federal', label: 'Federal', hint: 'President & National Assembly — nationwide' },
  { value: 'state', label: 'State', hint: 'Governor & State House of Assembly — one state' },
  { value: 'local', label: 'Local Government', hint: 'LG Chairman & Councillors — one LGA' },
]

const emptyForm = {
  name: '',
  level: 'federal' as ElectionLevel,
  state: '',
  lga: '',
  startsAt: '',
  endsAt: '',
  timezone: timezones[0].id,
  lockDate: '',
}

export default function ElectionSetup() {
  const { elections, loading, addElection, lockElection } = useElectionData()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await addElection(form)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message || 'Could not save this election.')
      return
    }
    setForm(emptyForm)
  }

  async function handleLock(id: string) {
    const result = await lockElection(id)
    if (!result.ok) setError(result.message || 'Could not lock this roster.')
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <h1 className="font-serif text-2xl font-semibold text-ink">
          Election setup &amp; scheduling
        </h1>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Election name
          </label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Presidential & National Assembly Election"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">Election level</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {levelOptions.map((opt) => (
              <label
                key={opt.value}
                className={
                  'cursor-pointer rounded-lg border p-3 text-sm ' +
                  (form.level === opt.value ? 'border-green-700 bg-green-700/5' : 'border-ink/15')
                }
              >
                <input
                  type="radio"
                  name="level"
                  className="sr-only"
                  checked={form.level === opt.value}
                  onChange={() => setForm({ ...form, level: opt.value })}
                />
                <p className="font-medium text-ink">{opt.label}</p>
                <p className="mt-0.5 text-xs text-ink/50">{opt.hint}</p>
              </label>
            ))}
          </div>
        </div>

        {(form.level === 'state' || form.level === 'local') && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-ink">
                State
              </label>
              <input
                id="state"
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="e.g. Kogi"
                className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
              />
            </div>
            {form.level === 'local' && (
              <div>
                <label htmlFor="lga" className="block text-sm font-medium text-ink">
                  Local Government Area
                </label>
                <input
                  id="lga"
                  required
                  value={form.lga}
                  onChange={(e) => setForm({ ...form, lga: e.target.value })}
                  placeholder="e.g. Ankpa"
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startsAt" className="block text-sm font-medium text-ink">
              Polling opens
            </label>
            <input
              id="startsAt"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>
          <div>
            <label htmlFor="endsAt" className="block text-sm font-medium text-ink">
              Polling closes
            </label>
            <input
              id="endsAt"
              type="datetime-local"
              required
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-ink">
              Timezone
            </label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            >
              {timezones.map((tz) => (
                <option key={tz.id} value={tz.id}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lockDate" className="block text-sm font-medium text-ink">
              Roster lock date
            </label>
            <input
              id="lockDate"
              type="date"
              required
              value={form.lockDate}
              onChange={(e) => setForm({ ...form, lockDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
            <p className="mt-1 text-xs text-ink/45">
              Parties/candidates can no longer be edited after this date.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-green-700 px-6 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save election'}
        </button>
      </form>

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">
        Configured elections
      </h2>
      {loading ? (
        <p className="mt-3 text-sm text-ink/50">Loading…</p>
      ) : elections.length === 0 ? (
        <p className="mt-3 text-sm text-ink/50">None yet — add one above.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {elections.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{e.name}</p>
                  <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink/60">
                    {e.level}
                    {e.level === 'state' && e.state ? ` · ${e.state}` : ''}
                    {e.level === 'local' && e.lga ? ` · ${e.lga}, ${e.state}` : ''}
                  </span>
                </div>
                <p className="text-xs text-ink/50">
                  {e.startsAt || '—'} → {e.endsAt || '—'} · {e.timezone}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    e.status === 'locked'
                      ? 'rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-medium text-ink/60'
                      : 'rounded-full bg-green-700/10 px-2.5 py-0.5 text-xs font-medium text-green-700'
                  }
                >
                  {e.status === 'locked' ? 'Roster locked' : 'Draft'}
                </span>
                {e.status === 'draft' && (
                  <button
                    onClick={() => handleLock(e.id)}
                    className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink"
                  >
                    Lock roster
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
