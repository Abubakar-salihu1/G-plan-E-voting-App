import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import EmblemLogo from '../components/EmblemLogo'
import PartyBadge from '../components/PartyBadge'
import SecurityPattern from '../components/SecurityPattern'
import { useElectionData } from '../lib/store'

const languages = ['English', 'Hausa', 'Yorùbá', 'Igbo', 'Naijá (Pidgin)']

const steps = [
  {
    n: '1',
    title: 'Verify who you are',
    body: 'Confirm your NIN and voter card, then complete a quick facial liveness check.',
  },
  {
    n: '2',
    title: 'Wait for your election window',
    body: 'Your dashboard shows exactly when your election opens, with a live countdown.',
  },
  {
    n: '3',
    title: 'Cast your vote once',
    body: 'Review your choice, confirm, and get a non-revealing receipt code — nothing that shows who you voted for.',
  },
]

export default function Landing() {
  const { parties, refresh } = useElectionData()
  const firstContest = parties.length > 0 ? parties[0].contest : null
  const candidatesInFirstContest = parties.filter((p) => p.contest === firstContest)
  const totalInFirstContest = candidatesInFirstContest.reduce((sum, c) => sum + c.voteCount, 0)
  const location = useLocation()

  useEffect(() => {
    const t = setInterval(refresh, 8000) // keeps the tally genuinely live
    return () => clearInterval(t)
  }, [refresh])

  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    el?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash])

  return (
    <div id="top">
      {/* Hero — solid green band (flag colour, full strength, not a tint) */}
      <section className="relative overflow-hidden bg-green-700">
        <SecurityPattern />
        <EmblemLogo className="pointer-events-none absolute -right-20 -top-20 h-[26rem] w-[26rem] opacity-10" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="font-serif text-sm font-semibold uppercase tracking-wide text-gold-400">
              A concept for Nigeria's 2027 election
            </p>
            <h1 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl">
              One person. One verified vote. One country watching in real time.
            </h1>
            <p className="mt-6 max-w-md text-lg text-white/80">
              NaijaVote pairs strong identity checks with a public, real-time tally — so every
              citizen can vote securely, and everyone can see the count as it happens.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="rounded-full bg-white px-6 py-3 font-semibold text-green-700 shadow-sm hover:bg-white/90"
              >
                Register to vote
              </Link>
              <a
                href="#how-it-works"
                className="rounded-full border border-white/40 px-6 py-3 font-semibold text-white hover:border-white/70"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3 border-b border-ink/10 pb-4">
              <EmblemLogo className="h-8 w-8" />
              <div>
                <p className="text-sm font-semibold text-ink">Live public tally</p>
                <p className="text-xs text-ink/50">
                  {firstContest ?? 'No contest configured yet'}
                  {totalInFirstContest > 0 ? ` · ${totalInFirstContest} votes so far` : ' · no votes yet'}
                </p>
              </div>
            </div>
            {candidatesInFirstContest.length === 0 ? (
              <p className="mt-4 text-sm text-ink/50">
                Once the election commission uploads parties and candidates, this card will show
                a live, real-time count for each of them.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {candidatesInFirstContest.map((c) => {
                  const pct = totalInFirstContest > 0 ? Math.round((c.voteCount / totalInFirstContest) * 100) : 0
                  return (
                    <li key={c.id}>
                      <div className="mb-1 flex items-center justify-between text-sm font-medium text-ink">
                        <span className="flex items-center gap-2">
                          <PartyBadge party={c.acronym} logoUrl={c.logoUrl} size="sm" />
                          {c.acronym}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/5">
                        <div className="h-full rounded-full bg-green-700 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-4 text-xs text-ink/40">
              Every party sits at 0% until the first real vote comes in — this card refreshes
              itself every few seconds. Individual votes are never shown, only totals.
            </p>
          </div>
        </div>
      </section>

      {/* How it works — solid white band */}
      <section id="how-it-works" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-3xl font-semibold text-ink">
            How voting works
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="border-l-2 border-green-700 pl-5">
                <span className="font-serif text-sm text-green-700">{step.n}</span>
                <h3 className="mt-1 font-serif text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-ink/70">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security — solid green band again, white cards floating on top */}
      <section id="security" className="relative overflow-hidden bg-green-700 px-6 py-20">
        <SecurityPattern />
        <div className="relative mx-auto max-w-6xl">
          <h2 className="font-serif text-3xl font-semibold text-white">
            Built so one voter can't become two votes
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-white">Identity, kept separate from your ballot</h3>
              <p className="mt-2 text-sm text-white/75">
                Your verified identity and your ballot content live in separate systems, linked
                only by a single-use token — never by your name or NIN.
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-white">Tamper-evident audit trail</h3>
              <p className="mt-2 text-sm text-white/75">
                Every action is written to an append-only, hash-chained log that independent
                observers can verify without seeing any individual vote.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Language — solid white band */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Available in your language
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {languages.map((lang) => (
              <span
                key={lang}
                className="rounded-full border border-ink/15 px-4 py-1.5 text-sm text-ink/80"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
