import { colorForAcronym } from '../lib/store'

type Props = {
  party: string
  size?: 'sm' | 'md' | 'lg'
  logoUrl?: string | null
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export default function PartyBadge({ party, size = 'md', logoUrl }: Props) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${party} logo`}
        className={`shrink-0 rounded-full border border-ink/10 object-cover ${sizeClasses[size]}`}
      />
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: colorForAcronym(party) }}
    >
      {party}
    </span>
  )
}
