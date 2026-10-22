import EmblemLogo from '../components/EmblemLogo'

const commitments = [
  {
    title: 'Keyboard & screen-reader support',
    body: 'Every interactive element is reachable by keyboard, with a visible focus ring, and uses semantic HTML so screen readers announce it correctly.',
  },
  {
    title: 'Responsive across devices',
    body: 'The same screens work on phones, tablets, and desktops — this is in fact a mobile-first build, since that\u2019s how most people will use it.',
  },
  {
    title: 'Reduced motion respected',
    body: 'If your device has "reduce motion" turned on, animations and transitions are shortened automatically.',
  },
  {
    title: 'Multiple languages',
    body: 'Built to support English, Hausa, Yoruba, Igbo, and Nigerian Pidgin. Language switching is on the roadmap but not fully wired up to translated content yet.',
  },
  {
    title: 'Low-bandwidth friendly',
    body: 'Pages are kept lightweight and text-first so the app stays usable on slower mobile connections.',
  },
]

export default function Accessibility() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Accessibility</h1>
      </div>

      <p className="mb-8 text-ink/70">
        Voting should work for everyone, including people using screen readers, keyboard-only
        navigation, or an older phone on a slow connection. Here's what this concept app does
        about that today, and what's still in progress.
      </p>

      <div className="space-y-4">
        {commitments.map((c) => (
          <div key={c.title} className="rounded-xl border border-ink/10 bg-white p-4">
            <h2 className="font-semibold text-ink">{c.title}</h2>
            <p className="mt-1 text-sm text-ink/70">{c.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-ink/50">
        Found something that doesn't work well with assistive technology? Use the incident report
        form on the{' '}
        <a href="/transparency" className="text-green-700 underline">
          transparency portal
        </a>{' '}
        to flag it.
      </p>
    </div>
  )
}
