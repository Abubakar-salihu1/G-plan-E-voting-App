import { useState } from 'react'
import { Link } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import PartyBadge from '../../components/PartyBadge'
import { useElectionData } from '../../lib/store'
import { adminFetch } from '../../lib/adminAuth'

const EMPTY = { contest: '', name: '', acronym: '', candidateName: '', slogan: '', runningMate: '', websiteUrl: '', bio: '' }

export default function PartyOnboarding() {
  const { elections, loading, addParty, removeParty } = useElectionData()
  const [electionId, setElectionId] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [logoFile, setLogoFile] = useState<{ url: string; name: string } | null>(null)
  const [photoFile, setPhotoFile] = useState<{ url: string; name: string } | null>(null)
  const [manifestoFile, setManifestoFile] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedElection = elections.find((e) => e.id === electionId)
  const effectiveElectionId = electionId || elections[0]?.id || ''
  const activeElection = elections.find((e) => e.id === effectiveElectionId)

  async function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (v: { url: string; name: string } | null) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await adminFetch('/api/uploads', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Upload failed.')
        return
      }
      setFile({ url: data.url, name: file.name })
    } catch {
      setError('Could not reach the server.')
    } finally {
      setUploading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeElection) return
    setSubmitting(true)
    setError('')
    const result = await addParty(activeElection.id, {
      ...form,
      logoUrl: logoFile?.url,
      candidatePhotoUrl: photoFile?.url,
      manifestoUrl: manifestoFile?.url,
      slogan: form.slogan || undefined,
      runningMate: form.runningMate || undefined,
      websiteUrl: form.websiteUrl || undefined,
      bio: form.bio || undefined,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message || 'Could not add this party.')
      return
    }
    setForm(EMPTY)
    setLogoFile(null)
    setPhotoFile(null)
    setManifestoFile(null)
  }

  async function handleRemove(partyId: string) {
    if (!activeElection) return
    const result = await removeParty(activeElection.id, partyId)
    if (!result.ok) setError(result.message || 'Could not remove this party.')
  }

  if (!loading && elections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <EmblemLogo className="mx-auto h-9 w-9" />
        <h1 className="mt-4 font-serif text-xl font-semibold text-ink">No elections yet</h1>
        <p className="mt-3 text-ink/60">
          Create an election first — parties and candidates are added to a specific election.
        </p>
        <Link
          to="/admin/elections"
          className="mt-6 inline-block rounded-full bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-900"
        >
          Go to election setup
        </Link>
      </div>
    )
  }

  const roster = activeElection?.parties ?? []
  const contests = [...new Set(roster.map((p) => p.contest))]
  const locked = activeElection?.status === 'locked'

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <h1 className="font-serif text-2xl font-semibold text-ink">
          Party &amp; candidate onboarding
        </h1>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-6">
        <label htmlFor="electionPick" className="block text-sm font-medium text-ink">
          Election
        </label>
        <select
          id="electionPick"
          value={effectiveElectionId}
          onChange={(e) => setElectionId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-green-700"
        >
          {elections.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} {e.status === 'locked' ? '(locked)' : ''}
            </option>
          ))}
        </select>
      </div>

      {locked ? (
        <div className="rounded-xl border border-ink/15 bg-ink/5 p-4 text-sm text-ink/70">
          This roster is locked — it can no longer be edited. To make changes, an election admin
          must first re-open it from Election Setup before the voting window begins.
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label htmlFor="contest" className="block text-sm font-medium text-ink">
              Contest / office
            </label>
            <input
              id="contest"
              required
              value={form.contest}
              onChange={(e) => setForm({ ...form, contest: e.target.value })}
              placeholder="e.g. President, Governor — Kogi State, Councillor — Ward 3"
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="pname" className="block text-sm font-medium text-ink">
              Party name
            </label>
            <input
              id="pname"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>
          <div>
            <label htmlFor="acronym" className="block text-sm font-medium text-ink">
              Acronym
            </label>
            <input
              id="acronym"
              required
              maxLength={10}
              value={form.acronym}
              onChange={(e) => setForm({ ...form, acronym: e.target.value.toUpperCase() })}
              placeholder="e.g. LP"
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 uppercase text-ink outline-none focus:border-green-700"
            />
          </div>
          <div>
            <label htmlFor="candidateName" className="block text-sm font-medium text-ink">
              Candidate name
            </label>
            <input
              id="candidateName"
              required
              value={form.candidateName}
              onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Party logo</label>
            <label
              htmlFor="logoInput"
              className="mt-1 flex h-16 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-ink/25 text-xs text-ink/50 hover:border-green-700"
            >
              {logoFile ? (
                <>
                  <img src={logoFile.url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <span className="max-w-[8rem] truncate">{logoFile.name}</span>
                </>
              ) : uploading ? (
                'Uploading…'
              ) : (
                'Click to upload logo'
              )}
            </label>
            <input
              id="logoInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, setLogoFile)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">Candidate photo</label>
            <label
              htmlFor="photoInput"
              className="mt-1 flex h-16 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-ink/25 text-xs text-ink/50 hover:border-green-700"
            >
              {photoFile ? (
                <>
                  <img src={photoFile.url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <span className="max-w-[8rem] truncate">{photoFile.name}</span>
                </>
              ) : uploading ? (
                'Uploading…'
              ) : (
                'Click to upload photo'
              )}
            </label>
            <input
              id="photoInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, setPhotoFile)}
            />
          </div>

          <div>
            <label htmlFor="slogan" className="block text-sm font-medium text-ink">
              Slogan <span className="text-ink/40">(optional)</span>
            </label>
            <input
              id="slogan"
              maxLength={150}
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>
          <div>
            <label htmlFor="runningMate" className="block text-sm font-medium text-ink">
              Running mate / deputy <span className="text-ink/40">(optional)</span>
            </label>
            <input
              id="runningMate"
              maxLength={150}
              value={form.runningMate}
              onChange={(e) => setForm({ ...form, runningMate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bio" className="block text-sm font-medium text-ink">
              Candidate biography <span className="text-ink/40">(optional)</span>
            </label>
            <textarea
              id="bio"
              rows={4}
              maxLength={2000}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Background, experience and what the candidate stands for — voters will read this."
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-ink">
              Website <span className="text-ink/40">(optional, full link)</span>
            </label>
            <input
              id="websiteUrl"
              type="url"
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-ink outline-none focus:border-green-700"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink">
              Manifesto <span className="text-ink/40">(optional PDF, up to 5 MB)</span>
            </label>
            <label
              htmlFor="manifestoInput"
              className="mt-1 flex h-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink/25 text-xs text-ink/50 hover:border-green-700"
            >
              {manifestoFile ? manifestoFile.name : uploading ? 'Uploading…' : 'Click to upload manifesto (PDF)'}
            </label>
            <input
              id="manifestoInput"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e, setManifestoFile)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-full bg-green-700 px-6 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60 sm:col-span-2"
          >
            {submitting ? 'Adding…' : 'Add to roster'}
          </button>
        </form>
      )}

      <h2 className="mt-10 font-serif text-lg font-semibold text-ink">
        Current roster ({roster.length})
      </h2>
      {roster.length === 0 ? (
        <p className="mt-3 text-sm text-ink/50">
          No parties added yet for this election — use the form above to start building the roster.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {contests.map((contest) => (
            <div key={contest}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{contest}</p>
              <div className="mt-2 space-y-3">
                {roster
                  .filter((p) => p.contest === contest)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-4"
                    >
                      <div className="flex items-center gap-4">
                        <PartyBadge party={p.acronym} logoUrl={p.logoUrl ?? undefined} />
                        <div>
                          <p className="font-medium text-ink">{p.name}</p>
                          <p className="text-xs text-ink/50">
                            {p.candidateName}
                            {p.manifestoUrl ? ' · manifesto ✓' : ''}
                            {p.bio ? ' · bio ✓' : ''}
                          </p>
                        </div>
                      </div>
                      {!locked && (
                        <button
                          onClick={() => handleRemove(p.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
