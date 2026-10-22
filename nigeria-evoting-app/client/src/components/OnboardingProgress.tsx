const steps = ['Account', 'NIN', 'OTP', 'MFA', 'Voter card', 'Face check', 'Done']

export default function OnboardingProgress({ current }: { current: number }) {
  return (
    <ol className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-medium">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const state = stepNum < current ? 'done' : stepNum === current ? 'active' : 'upcoming'
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ' +
                (state === 'done'
                  ? 'border-green-700 bg-green-700 text-white dark:border-gold dark:bg-gold dark:text-charcoal'
                  : state === 'active'
                  ? 'border-green-700 text-green-700 dark:border-gold dark:text-gold'
                  : 'border-ink/20 text-ink/40 dark:border-paper/20 dark:text-paper/40')
              }
            >
              {state === 'done' ? '✓' : stepNum}
            </span>
            <span
              className={
                state === 'upcoming'
                  ? 'text-ink/40 dark:text-paper/40'
                  : 'text-ink dark:text-paper'
              }
            >
              {label}
            </span>
            {stepNum < steps.length && <span className="mx-1 text-ink/20 dark:text-paper/20">—</span>}
          </li>
        )
      })}
    </ol>
  )
}
