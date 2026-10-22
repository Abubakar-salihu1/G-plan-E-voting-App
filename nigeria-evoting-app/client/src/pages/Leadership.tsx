import EmblemLogo from '../components/EmblemLogo'

// Fresh-setup state: no office-holders pre-filled. Whoever deploys this
// fills in real names via the admin invite flow — nothing here assumes a
// specific person or election cycle.
const seats = [
  'Chairman',
  'National Commissioner — North Central',
  'National Commissioner — North East',
  'National Commissioner — North West',
  'National Commissioner — South East',
  'National Commissioner — South South',
  'National Commissioner — South West',
]

export default function Leadership() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-serif text-sm font-semibold uppercase tracking-wide text-green-700">
        Transparency portal
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-ink sm:text-4xl">
        Commission leadership
      </h1>
      <p className="mt-4 max-w-2xl text-ink/70">
        This is a fresh deployment — no office-holders are pre-filled. Seats are populated as
        admin accounts are set up through the invite flow, and stay current as roles change hands.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {seats.map((seat) => (
          <div
            key={seat}
            className="flex items-center gap-3 rounded-xl border border-dashed border-ink/20 p-4 text-sm text-ink/60"
          >
            <EmblemLogo className="h-8 w-8 shrink-0 opacity-40" />
            <div>
              <p className="font-medium text-ink/80">{seat}</p>
              <span className="text-xs text-ink/35">— to be filled by admin</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
