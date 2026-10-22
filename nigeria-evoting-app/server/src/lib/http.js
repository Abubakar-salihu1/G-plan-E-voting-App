export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** Express 4 does not catch rejected promises — wrap every async handler. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message })
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request too large.' })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON.' })
  if (err.code === 'P2002') return res.status(409).json({ message: 'That value is already in use.' })
  console.error(err)
  res.status(500).json({ message: 'Something went wrong on our side.' })
}
