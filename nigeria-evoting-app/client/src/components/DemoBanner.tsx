import { useEffect, useState } from 'react'

// A slim prototype notice, shown only while the server runs the simulated identity checks.
// Visitors can dismiss it for the rest of their visit. The server can hide it entirely (HIDE_DEMO_BANNER).
const KEY = 'demoBannerDismissed'

export default function DemoBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return
    fetch('/api/meta')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setShow(!!d?.demo && d?.banner !== false))
      .catch(() => {})
  }, [])
  if (!show) return null
  return (
    <div role="note" className="flex items-center justify-center gap-3 bg-gold/90 px-4 py-1 text-[11px] font-medium leading-snug text-ink">
      <span>Prototype: a concept for secure digital voting. Not affiliated with INEC. Please use test details only.</span>
      <button
        type="button"
        aria-label="Dismiss notice"
        onClick={() => {
          sessionStorage.setItem(KEY, '1')
          setShow(false)
        }}
        className="shrink-0 px-1 text-sm leading-none text-ink/70 hover:text-ink"
      >
        ×
      </button>
    </div>
  )
}
