// RFC 6238 TOTP (SHA-1, 6 digits, 30s) with no third-party dependency.
import crypto from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30

export function base32Encode(buf) {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of buf) {
    value = ((value << 8) | b) & 0xffffff
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(str) {
  let bits = 0
  let value = 0
  const out = []
  for (const ch of str.replace(/=+$/, '').toUpperCase()) {
    const idx = ALPHABET.indexOf(ch)
    if (idx < 0) throw new Error('Invalid base32 character')
    value = ((value << 5) | idx) & 0xffffff
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export function generateSecret() {
  return base32Encode(crypto.randomBytes(20))
}

export function hotp(secretBuf, counter) {
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const h = crypto.createHmac('sha1', secretBuf).update(msg).digest()
  const offset = h[h.length - 1] & 0xf
  const bin =
    ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3]
  return String(bin % 1_000_000).padStart(6, '0')
}

/**
 * Verifies a code within ±1 step. Returns the matched step number, or null.
 * Pass `lastStep` to reject replays (step must be strictly greater).
 */
export function verifyTotp(secretBase32, code, { lastStep = null, now = Date.now() } = {}) {
  if (!/^\d{6}$/.test(String(code))) return null
  const secret = base32Decode(secretBase32)
  const current = Math.floor(now / 1000 / STEP_SECONDS)
  for (let step = current - 1; step <= current + 1; step++) {
    if (lastStep !== null && lastStep !== undefined && step <= lastStep) continue
    const expected = hotp(secret, step)
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(code)))) return step
  }
  return null
}

export function otpauthUrl(secret, account, issuer = 'NaijaVote') {
  const label = encodeURIComponent(`${issuer}:${account}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}
