import { useEffect, useState } from 'react'

// Shown only when the server is running the simulated identity checks (a demo, not a real election).
export default function DemoBanner() {
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    fetch('/api/meta')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDemo(!!d?.demo))
      .catch(() => {})
  }, [])
  if (!demo) return null
  return (
    <div role="note" className="bg-gold/90 px-4 py-2 text-center text-xs font-medium text-ink">
      DEMO — identity checks (NIN, face) are simulated. A concept project, not an official INEC system. Don't enter real personal details.
    </div>
  )
}
