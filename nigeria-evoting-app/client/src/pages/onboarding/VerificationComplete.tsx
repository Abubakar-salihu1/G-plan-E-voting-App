import { Link } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import OnboardingProgress from '../../components/OnboardingProgress'

export default function VerificationComplete() {
  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <EmblemLogo className="h-14 w-14 text-green-700 dark:text-gold" />
      </div>

      <OnboardingProgress current={7} />

      <h1 className="font-serif text-2xl font-semibold text-ink dark:text-paper">
        Verification submitted
      </h1>
      <p className="mt-3 text-ink/70 dark:text-paper/70">
        We're checking your NIN, voter card, and face match against the roll. This usually takes a
        few minutes — you'll get a notification the moment it's done, and you won't be able to
        vote until it clears.
      </p>

      <Link
        to="/dashboard"
        className="mt-8 rounded-full bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-900"
      >
        Go to my dashboard
      </Link>
    </div>
  )
}
