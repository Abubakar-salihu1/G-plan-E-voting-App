const TOKEN_KEY = 'naijavote_admin_token'

/**
 * Stores the real JWT issued by POST /api/admin/login. The server verifies
 * this token on every protected /api/admin/* request — that server-side
 * check is the actual security boundary. Storing it here only lets the
 * client remember it and decide what to render; it is not itself a trust
 * decision.
 */
export function setAdminToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function signOutAdmin() {
  const token = getAdminToken()
  sessionStorage.removeItem(TOKEN_KEY)
  if (token) {
    fetch('/api/admin/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {})
  }
}

export function isAdminSignedIn() {
  return !!getAdminToken()
}

/** Convenience wrapper: fetch() with the admin token attached. */
export async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getAdminToken()
  return fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
