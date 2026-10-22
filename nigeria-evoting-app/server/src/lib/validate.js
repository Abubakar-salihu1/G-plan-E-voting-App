export const normEmail = (s) => String(s ?? '').trim().toLowerCase()

export const isEmail = (s) =>
  typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)

export const isStr = (v, min = 1, max = 200) =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max

export const isUuid = (v) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/** Returns an error message, or null if the password is acceptable. */
export function passwordProblem(pw) {
  if (typeof pw !== 'string') return 'Password is required.'
  if (pw.length < 10) return 'Password must be at least 10 characters.'
  // bcrypt silently ignores everything past 72 bytes.
  if (Buffer.byteLength(pw) > 72) return 'Password must be at most 72 bytes.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain both letters and numbers.'
  return null
}

export function isValidDate(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return false
  return !Number.isNaN(new Date(v).getTime())
}

export function isTimezone(tz) {
  if (typeof tz !== 'string') return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
