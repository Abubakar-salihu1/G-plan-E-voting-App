// Small in-memory fixed-window limiter. Fine for a single instance; behind a
// load balancer swap the Map for Redis (same interface).
export function rateLimit({
  windowMs,
  max,
  key = (req) => req.ip,
  skip = () => false,
  message = 'Too many attempts — please wait and try again.',
}) {
  const hits = new Map()
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
  }, Math.min(windowMs, 60_000))
  timer.unref()

  return (req, res, next) => {
    if (skip(req)) return next()
    const k = key(req)
    const now = Date.now()
    let entry = hits.get(k)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(k, entry)
    }
    entry.count += 1
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return res.status(429).json({ message })
    }
    next()
  }
}
