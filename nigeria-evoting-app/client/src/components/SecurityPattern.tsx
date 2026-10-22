/**
 * A faint repeating diagonal line pattern, reminiscent of the fine
 * security-print texture on ID cards and ballots. Deliberately subtle —
 * meant to be felt more than seen.
 */
export default function SecurityPattern() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="security-lines"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="14" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#security-lines)" />
    </svg>
  )
}
