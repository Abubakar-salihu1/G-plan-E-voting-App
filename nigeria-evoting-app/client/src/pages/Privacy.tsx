import EmblemLogo from '../components/EmblemLogo'

const sections = [
  {
    title: 'What we collect',
    body: 'Your email, a hashed version of your NIN (never the raw number), your voter card number, and a hashed face template used only to prevent duplicate accounts — not a photo of you that anyone can browse.',
  },
  {
    title: 'What we never store',
    body: 'Your raw NIN, your password in readable form, or anything that links your identity to a specific vote. These are architectural guarantees, not just policy promises — see the security section on the home page for how.',
  },
  {
    title: 'Who can see what',
    body: 'Commission staff can see your verification status (verified / pending / rejected) and whether you\u2019ve voted — never what you voted for. That information literally isn\u2019t stored anywhere linked to you.',
  },
  {
    title: 'Public information',
    body: 'Aggregate vote totals per party are public, by design, on the transparency portal. No individual-level data is ever part of that.',
  },
  {
    title: 'Your rights',
    body: 'In a real deployment, you would be able to request a copy of the account data held about you, and request account deletion before an election\u2019s roster locks. This concept build doesn\u2019t yet implement those request flows.',
  },
]

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Privacy</h1>
      </div>

      <p className="mb-8 text-ink/70">
        This is a conceptual project, so there's no real production data at stake — but the
        design itself follows real privacy principles, summarized here.
      </p>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="rounded-xl border border-ink/10 bg-white p-4">
            <h2 className="font-semibold text-ink">{s.title}</h2>
            <p className="mt-1 text-sm text-ink/70">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
