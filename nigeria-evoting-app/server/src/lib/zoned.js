// Turns a wall-clock time typed by an admin ("2027-02-11T08:00") into the correct instant for the
// election's own timezone. Without this, the server would read it in ITS timezone (UTC) and
// polls would open an hour off for Nigeria (WAT, UTC+1).
// Strings that already carry an offset ("...Z", "...+01:00") are left exactly as given.
export function zonedToUtc(local, timeZone) {
  const m = String(local).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!m) return new Date(local)
  const [Y, Mo, D] = [m[1], m[2], m[3]].map(Number)
  const [h, mi, s] = [m[4] ?? 0, m[5] ?? 0, m[6] ?? 0].map(Number)
  const wall = Date.UTC(Y, Mo - 1, D, h, mi, s)

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const offsetAt = (ms) => {
    const parts = fmt.formatToParts(new Date(ms))
    const g = (t) => Number(parts.find((p) => p.type === t).value)
    return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - ms
  }
  let guess = wall - offsetAt(wall)
  guess = wall - offsetAt(guess) // second pass handles daylight-saving edges
  return new Date(guess)
}
