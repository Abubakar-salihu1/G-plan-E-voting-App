import crypto from 'node:crypto'
import { config } from './config.js'

/** Keyed HMAC-SHA256 — used for NIN, PVC, face hash, OTPs, tokens, receipts. */
export function hmac(value, purpose) {
  return crypto.createHmac('sha256', config.hashPepper).update(`${purpose}:${value}`).digest('hex')
}

/** Constant-time string comparison. */
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

const key = () => Buffer.from(config.dataKeyHex, 'hex')

/** AES-256-GCM. Output: iv.tag.ciphertext (base64 parts). */
export function encrypt(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.')
}

export function decrypt(payload) {
  const [iv, tag, enc] = String(payload).split('.').map((p) => Buffer.from(p, 'base64'))
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
