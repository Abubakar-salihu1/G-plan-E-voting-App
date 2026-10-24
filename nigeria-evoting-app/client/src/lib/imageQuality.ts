import { useEffect, useState, type RefObject } from 'react'

// Live check of the camera picture so a dark, covered or washed-out frame can't be captured.
// This is photo QUALITY only. It cannot tell a live person from a photo of a photo —
// that needs a real liveness provider on the server.

export type FrameCheck = { ok: boolean; problem: string | null; hint: string | null }

const W = 160
const H = 120
let work: HTMLCanvasElement | null = null

export function assessFrame(video: HTMLVideoElement | null): FrameCheck {
  if (!video || !video.videoWidth || video.readyState < 2) {
    return { ok: false, problem: 'Camera is starting…', hint: null }
  }
  work = work ?? document.createElement('canvas')
  work.width = W
  work.height = H
  const ctx = work.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { ok: true, problem: null, hint: null } // cannot analyse: do not block
  ctx.drawImage(video, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  const luma = new Float32Array(W * H)
  let sum = 0
  let sum2 = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    luma[p] = l
    sum += l
    sum2 += l * l
  }
  const n = W * H
  const mean = sum / n
  const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean))

  // Sharpness: variance of a simple Laplacian (low = blurry).
  let lap = 0
  let lap2 = 0
  let m = 0
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x
      const v = 4 * luma[p] - luma[p - 1] - luma[p + 1] - luma[p - W] - luma[p + W]
      lap += v
      lap2 += v * v
      m++
    }
  }
  const sharp = lap2 / m - (lap / m) ** 2

  if (mean < 60) return { ok: false, problem: 'Too dark — move to a brighter place or face a light.', hint: null }
  if (mean > 225) return { ok: false, problem: 'Too bright — move away from the strong light.', hint: null }
  if (std < 22) {
    return { ok: false, problem: 'No clear picture — make sure the camera is not covered and your face fills the circle.', hint: null }
  }
  return { ok: true, problem: null, hint: sharp < 20 ? 'The picture looks blurry — hold still.' : null }
}

/** Re-checks the live video about twice a second while `active`. */
export function useFrameQuality(videoRef: RefObject<HTMLVideoElement>, active: boolean): FrameCheck {
  const [check, setCheck] = useState<FrameCheck>({ ok: false, problem: 'Camera is starting…', hint: null })
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setCheck(assessFrame(videoRef.current)), 500)
    return () => window.clearInterval(id)
  }, [active, videoRef])
  return check
}
