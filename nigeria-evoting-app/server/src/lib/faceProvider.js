import crypto from 'node:crypto'
import { config } from './config.js'
import { hmac } from './crypto.js'
import { HttpError } from './http.js'

// ── Face verification provider interface ────────────────────────────────────
// A provider must implement:
//   enroll({ image: Buffer }) -> { templateHash: string }          (sign-up)
//   match({ image: Buffer, enrolledTemplateHash }) -> { match: boolean }   (vote time)
// and must perform REAL liveness detection + face matching (e.g. a licensed
// vendor SDK/API). The 'demo' provider below does neither — it only proves a
// JPEG was received. config.js refuses to start in production with 'demo'.

const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024

/** Parses a data URL and checks it really is a JPEG within the size limit. */
export function parseImageDataUrl(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
  if (!m) throw new HttpError(400, 'Send the capture as a JPEG data URL.')
  const buf = Buffer.from(m[1], 'base64')
  if (buf.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image is too large.')
  if (buf.length < 1024 || !(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) {
    throw new HttpError(400, 'That does not look like a valid photo.')
  }
  return buf
}

const demo = {
  async enroll({ image }) {
    // Hash of the exact bytes: only catches byte-identical re-uploads. It is
    // NOT biometric duplicate detection.
    return { templateHash: hmac(crypto.createHash('sha256').update(image).digest('hex'), 'face') }
  },
  async match() {
    return { match: true } // demo only: no real matching
  },
}

const providers = { demo }

export function faceProvider() {
  const p = providers[config.faceProvider]
  if (!p) throw new Error(`Unknown FACE_PROVIDER "${config.faceProvider}". Register it in lib/faceProvider.js.`)
  return p
}

if (config.faceProvider === 'demo') {
  console.warn('[warn] FACE_PROVIDER=demo — NO real liveness/face matching is happening. Demo use only.')
}
