import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'

export default function EligibilityCheck() {
  const navigate = useNavigate()
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null)

  function handleContinue() {
    if (answer === 'yes') navigate('/vote/ballot')
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9 text-green-700 dark:text-gold" />
        <p className="font-serif text-lg font-semibold text-ink dark:text-paper">
          Confirm your eligibility
        </p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-paper/10 dark:bg-charcoal">
        <p className="text-sm text-ink dark:text-paper">
          I confirm that I am a Nigerian citizen, aged 18 or older, registered to vote in this
          constituency, and that I have not already voted in this election.
        </p>

        <div className="mt-4 space-y-2">
          <label
            className={
              'flex cursor-pointer items-center gap-3 rounded-xl border p-3 ' +
              (answer === 'yes'
                ? 'border-green-700 bg-green-700/5 dark:border-gold dark:bg-gold/10'
                : 'border-ink/15 dark:border-paper/20')
            }
          >
            <input
              type="radio"
              name="eligible"
              checked={answer === 'yes'}
              onChange={() => setAnswer('yes')}
              className="h-5 w-5 accent-green-700"
            />
            <span className="text-ink dark:text-paper">Yes, I confirm all of the above</span>
          </label>
          <label
            className={
              'flex cursor-pointer items-center gap-3 rounded-xl border p-3 ' +
              (answer === 'no'
                ? 'border-red-500 bg-red-500/5'
                : 'border-ink/15 dark:border-paper/20')
            }
          >
            <input
              type="radio"
              name="eligible"
              checked={answer === 'no'}
              onChange={() => setAnswer('no')}
              className="h-5 w-5 accent-red-600"
            />
            <span className="text-ink dark:text-paper">No / I'm not sure</span>
          </label>
        </div>

        {answer === 'no' && (
          <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
            You can't continue to the ballot until you can confirm all of these. Visit the Help
            Centre if anything above doesn't apply to you.
          </p>
        )}

        <button
          onClick={handleContinue}
          disabled={answer !== 'yes'}
          className="mt-5 w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to ballot
        </button>
      </div>
    </div>
  )
}
