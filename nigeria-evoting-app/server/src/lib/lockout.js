// Per-account lockout on repeated failures (on top of IP rate limiting).
const MAX_FAILURES = 5
const LOCK_MS = 15 * 60 * 1000

export const isLocked = (user) => !!user?.lockedUntil && user.lockedUntil > new Date()

export async function recordFailure(delegate, user) {
  const updated = await delegate.update({
    where: { id: user.id },
    data: { failedLogins: { increment: 1 } },
  })
  if (updated.failedLogins >= MAX_FAILURES) {
    await delegate.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) },
    })
    return true // just locked
  }
  return false
}

export async function clearFailures(delegate, user) {
  if (user.failedLogins || user.lockedUntil) {
    await delegate.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } })
  }
}
