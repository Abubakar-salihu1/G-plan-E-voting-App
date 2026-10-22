type Props = {
  className?: string
}

/**
 * The real Nigerian coat of arms, used as the app logo per request.
 * Note for the record: this is a protected national emblem, so a real
 * production deployment would need government authorization to use it —
 * doesn't block a concept/demo project, just flagging it once for the file.
 */
export default function EmblemLogo({ className = 'h-10 w-10' }: Props) {
  return (
    <img
      src="/emblem.png"
      alt="Coat of Arms of Nigeria"
      className={`${className} object-contain`}
    />
  )
}
