import { config } from './config.js'
import { HttpError } from './http.js'
import { assessStats, lumaStats } from './imageStats.js'

// Backstop for the face-capture screens. The browser already stops a dark / covered-camera
// frame from being taken, but a script can call the API directly, so the server re-checks.
// These limits are deliberately LENIENT (reject only clearly unusable photos).
//
// IMPORTANT: this is photo QUALITY, not liveness. A photo of a photo or of a screen can still pass.
// Real liveness + face matching needs a licensed provider (see faceProvider.js).
let decodeJpeg
async function getDecoder() {
  if (decodeJpeg !== undefined) return decodeJpeg
  try {
    const mod = await import('jpeg-js')
    decodeJpeg = mod.default?.decode ?? mod.decode
  } catch {
    decodeJpeg = null
  }
  return decodeJpeg
}

export async function requireGoodPhoto(buf) {
  const decode = await getDecoder()
  if (!decode) {
    if (config.isProd) throw new HttpError(503, 'Photo checks are unavailable right now.')
    console.warn('[warn] jpeg-js is not installed: skipping server-side photo quality check.')
    return
  }
  let img
  try {
    img = decode(buf, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 25, maxMemoryUsageInMB: 128 })
  } catch {
    throw new HttpError(400, 'That does not look like a valid photo.')
  }
  const problem = assessStats(lumaStats(img.data, img.width, img.height))
  if (problem) throw new HttpError(422, problem)
}
