import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BackupCodes from '../components/BackupCodes'
import EmblemLogo from '../components/EmblemLogo'
import { useElectionData } from '../lib/store'
import { signOutVoter, voterFetch } from '../lib/voterAuth'

const notifications = [
  { id: 1, text: 'Your identity verification was approved.', time: '2h ago' },
]

function useCountdown(target: Date | null) {
  const [msLeft, setMsLeft] = useState(target ? target.getTime() - Date.now() : 0)
  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setMsLeft(target.getTime() - Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])
  const clamped = Math.max(msLeft, 0)
  const days = Math.floor(clamped / 86400000)
  const hours = Math.floor((clamped % 86400000) / 3600000)
  const minutes = Math.floor((clamped % 3600000) / 60000)
  const seconds = Math.floor((clamped % 60000) / 1000)
  return { days, hours, minutes, seconds, isOpen: !!target && msLeft <= 0 }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { elections } = useElectionData()
  // Nearest upcoming election that's actually been scheduled by an admin —
  // nothing hardcoded here.
  const nextElection = [...elections]
    .filter((e) => e.startsAt)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0]
  const target = nextElection ? new Date(nextElection.startsAt) : null
  const countdown = useCountdown(target)
  const [verified, setVerified] = useState<boolean | null>(null)
  const hasVoted = false // still demo — the backend doesn't yet expose "has this voter spent a token"

  useEffect(() => {
    voterFetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setVerified(!!data.voter?.verified))
      .catch(() => setVerified(false))
  }, [])

  function handleSignOut() {
    signOutVoter()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <EmblemLogo className="h-9 w-9" />
          <div>
            <h1 className="font-serif text-2xl font-semibold text-ink">Welcome back</h1>
            <p className="text-sm text-ink/60">Your voter dashboard</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink hover:border-ink/40"
        >
          Sign out
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Verification status */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <p className="text-sm font-medium text-ink/60">Verification status</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={
                verified === null
                  ? 'h-2.5 w-2.5 rounded-full bg-ink/20'
                  : verified
                  ? 'h-2.5 w-2.5 rounded-full bg-green-600'
                  : 'h-2.5 w-2.5 rounded-full bg-yellow-500'
              }
            />
            <p className="font-serif text-lg font-semibold text-ink">
              {verified === null ? 'Checking…' : verified ? 'Verified' : 'Not yet verified'}
            </p>
          </div>
          <p className="mt-1 text-xs text-ink/45">
            {verified === false
              ? 'Complete NIN, voter card, and face verification to unlock voting.'
              : 'NIN, voter card, and face match all cleared.'}
          </p>
        </div>

        {/* Vote status */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <p className="text-sm font-medium text-ink/60">Your vote</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={hasVoted ? 'h-2.5 w-2.5 rounded-full bg-green-600' : 'h-2.5 w-2.5 rounded-full bg-ink/20'} />
            <p className="font-serif text-lg font-semibold text-ink">
              {hasVoted ? 'Vote cast' : 'Not yet cast'}
            </p>
          </div>
          <p className="mt-1 text-xs text-ink/45">
            {hasVoted ? 'Thank you for voting.' : 'You can vote once polling opens below.'}
          </p>
        </div>

        {/* Election + countdown */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:col-span-2">
          {!nextElection ? (
            <>
              <p className="text-sm font-medium text-ink/60">No election scheduled yet</p>
              <p className="mt-2 text-sm text-ink/50">
                Once the election commission schedules a federal, state, or local government
                election, it'll appear here with a live countdown.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-ink/60">{nextElection.name}</p>
              {!countdown.isOpen ? (
                <>
                  <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                    {[
                      ['Days', countdown.days],
                      ['Hours', countdown.hours],
                      ['Min', countdown.minutes],
                      ['Sec', countdown.seconds],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-xl bg-ink/5 py-3">
                        <p className="font-serif text-2xl font-semibold text-ink">
                          {String(value).padStart(2, '0')}
                        </p>
                        <p className="text-xs text-ink/50">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-ink/45">Until polling opens</p>
                </>
              ) : (
                <div className="mt-4 flex items-center justify-between">
                  <p className="font-serif text-lg font-semibold text-green-700">Polling is open now</p>
                  {!hasVoted && verified && (
                    <Link
                      to="/vote/login"
                      className="rounded-full bg-green-700 px-5 py-2.5 font-semibold text-white hover:bg-green-900"
                    >
                      Vote now
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Candidates */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:col-span-2">
          <p className="text-sm font-medium text-ink/60">Know who you're voting for</p>
          <p className="mt-1 text-sm text-ink/70">
            Read each candidate's biography and manifesto, and compare candidates side by side, before polling opens.
          </p>
          <Link to="/candidates" className="mt-3 inline-block rounded-full border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-700/10">
            See candidates &amp; parties
          </Link>
        </div>

        <BackupCodes />

        {/* Notifications */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:col-span-2">
          <p className="text-sm font-medium text-ink/60">Notifications</p>
          <ul className="mt-3 divide-y divide-ink/10">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-ink">{n.text}</span>
                <span className="text-xs text-ink/40">{n.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link to="/leadership" className="font-medium text-green-700">
          Commission leadership →
        </Link>
        <Link to="/help" className="font-medium text-green-700">
          Help centre →
        </Link>
      </div>
    </div>
  )
}
