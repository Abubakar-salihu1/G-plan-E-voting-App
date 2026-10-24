import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import OnboardingProgress from '../../components/OnboardingProgress'
import { assessFrame, useFrameQuality } from '../../lib/imageQuality'
import { voterFetch } from '../../lib/voterAuth'

type Stage = 'requesting' | 'live' | 'denied' | 'captured'

export default function FacialCapture() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stage, setStage] = useState<Stage>('requesting')
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const quality = useFrameQuality(videoRef, stage === 'live')

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' } })
      .then((s) => {
        stream = s
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
        setStage('live')
      })
      .catch(() => setStage('denied'))
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  // After "Retake" the <video> element is created again, so give it the camera stream again.
  useEffect(() => {
    if (stage === 'live' && videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [stage])

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const now = assessFrame(video)
    if (!now.ok) {
      setError(now.problem || 'Could not read the camera picture.')
      return
    }
    setError('')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0)
    setPhoto(canvas.toDataURL('image/jpeg'))
    setStage('captured')
    // Real liveness detection (confirming a live person, not a photo of a
    // photo) is still a UI-only prompt below, not a real ML check — see the
    // comment on POST /api/auth/verify-face for exactly what IS real: this
    // image gets hashed server-side and checked for duplicate-account use.
  }

  async function submit() {
    if (!photo) return
    setSubmitting(true)
    setError('')
    try {
      const res = await voterFetch('/api/auth/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photo }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not complete verification.')
        return
      }
      navigate('/verify/complete')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <p className="font-serif text-lg font-semibold text-ink">Face &amp; liveness check</p>
      </div>

      <OnboardingProgress current={6} />

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      <div className="rounded-2xl border border-ink/10 bg-white p-6">
        <div className="relative mx-auto aspect-square w-64 overflow-hidden rounded-full bg-ink/5">
          {stage !== 'captured' && (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
          )}
          {stage === 'captured' && photo && (
            <img src={photo} alt="Captured selfie" className="h-full w-full scale-x-[-1] object-cover" />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-green-700/40" />
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <p className="mt-5 text-center text-sm text-ink/70">
          {stage === 'requesting' && 'Requesting camera access…'}
          {stage === 'denied' && 'Camera access was denied — enable it in your browser settings to continue.'}
          {stage === 'live' && (quality.problem || quality.hint || 'Center your face in the circle, then blink slowly before capturing.')}
          {stage === 'captured' && 'Looks good. Submit to finish verification, or retake.'}
        </p>

        <div className="mt-5 flex gap-3">
          {stage === 'live' && (
            <button
              onClick={capture}
              disabled={!quality.ok}
              className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              Capture
            </button>
          )}
          {stage === 'captured' && (
            <>
              <button
                onClick={() => setStage('live')}
                className="w-full rounded-full border border-ink/20 py-2.5 font-semibold text-ink"
              >
                Retake
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
