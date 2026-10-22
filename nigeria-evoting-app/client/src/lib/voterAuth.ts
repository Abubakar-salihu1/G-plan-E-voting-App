const TOKEN_KEY = 'naijavote_voter_token'

/**
 * Stores the real JWT issued by POST /api/auth/login or /api/auth/signup.
 * The server verifies this token on every protected request — that's the
 * real security boundary, not this storage.
 */
export function setVoterToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function getVoterToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function signOutVoter() {
  const token = getVoterToken()
  sessionStorage.removeItem(TOKEN_KEY)
  // Tell the server too, so a copied token stops working immediately (best effort).
  if (token) {
    fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {})
  }
}

export function isVoterSignedIn() {
  return !!getVoterToken()
}

export async function voterFetch(path: string, options: RequestInit = {}) {
  const token = getVoterToken()
  return fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
