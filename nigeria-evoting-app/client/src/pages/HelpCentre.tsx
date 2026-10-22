import EmblemLogo from '../components/EmblemLogo'

const faqs = [
  {
    q: 'Who can register to vote on NaijaVote?',
    a: 'Any Nigerian citizen aged 18 or older with a valid NIN and a Permanent Voter\u2019s Card (PVC) can register. You\u2019ll verify both, plus a quick face check, before your account is approved.',
  },
  {
    q: 'Why do I need to verify my face every time I vote, not just at sign-up?',
    a: 'Your voter card and NIN alone aren\u2019t fully secret — a fresh liveness check at vote-time makes sure the person casting the ballot is really you, every single time, not just whoever has those two numbers.',
  },
  {
    q: 'Can anyone see who I voted for?',
    a: 'No. Your identity and your ballot are stored in separate systems, linked only by a one-time token that carries no information about your choice. Not even system administrators can see an individual vote.',
  },
  {
    q: 'What is the receipt code for?',
    a: 'It proves you voted, in case of a dispute — it does not reveal or encode who you voted for.',
  },
  {
    q: 'What if I lose access to my account before polling day?',
    a: 'Contact the commission through the channels listed for your constituency. This concept app doesn\u2019t yet include an account-recovery flow — that\u2019s one of the pieces still to be built.',
  },
  {
    q: 'Is this the official INEC voting system?',
    a: 'No. NaijaVote is a conceptual design project, not affiliated with, endorsed by, or authorised by INEC or the Government of Nigeria.',
  },
]

export default function HelpCentre() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Help centre</h1>
      </div>

      <div className="space-y-4">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-ink/10 bg-white p-4 open:border-green-700/40"
          >
            <summary className="cursor-pointer list-none font-medium text-ink marker:content-none">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <span className="shrink-0 text-ink/40 transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 text-sm text-ink/70">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
