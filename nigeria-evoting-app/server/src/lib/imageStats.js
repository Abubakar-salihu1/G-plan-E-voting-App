// Pure brightness checks for the face-capture photo (no imports, so they are easy to test).
// This is photo QUALITY, not liveness: a photo of a photo or a screen can still pass.
// Limits are deliberately lenient — they only reject clearly unusable photos.
export const LIMITS = { minMean: 40, maxMean: 240, minStd: 12 }

/** Mean and standard deviation of brightness, sampled on a grid (cheap even for large photos). */
export function lumaStats(rgba, width, height) {
  const step = Math.max(1, Math.floor(Math.max(width, height) / 160))
  let n = 0
  let sum = 0
  let sum2 = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const l = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
      sum += l
      sum2 += l * l
      n++
    }
  }
  const mean = n ? sum / n : 0
  return { mean, std: Math.sqrt(Math.max(0, (n ? sum2 / n : 0) - mean * mean)) }
}

/** Returns a plain-language problem, or null if the photo is usable. */
export function assessStats({ mean, std }) {
  if (mean < LIMITS.minMean) return 'The photo is too dark. Retake it in better light.'
  if (mean > LIMITS.maxMean) return 'The photo is too bright. Move away from strong light and retake it.'
  if (std < LIMITS.minStd) return 'The photo has no clear detail. Make sure the camera is not covered and your face is visible.'
  return null
}
