import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmblemLogo from '../../components/EmblemLogo'
import { assessFrame, useFrameQuality } from '../../lib/imageQuality'
import { voterFetch } from '../../lib/voterAuth'

type Stage = 'requesting' | 'live' | 'denied' | 'captured' | 'error'

export default function VoteLiveness() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stage, setStage] = useState<Stage>('requesting')
  const [error, setError] = useState('')
  const quality = useFrameQuality(videoRef, stage === 'live')

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' } })
      .then((s) => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        setStage('live')
      })
      .catch(() => setStage('denied'))
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  async function confirmAndContinue() {
    const video = videoRef.current
    const proof = sessionStorage.getItem('naijavote_login_proof')
    if (!proof) {
      navigate('/vote/login')
      return
    }
    if (!video || !video.videoWidth) {
      setError('Camera is not ready yet — wait a moment and try again.')
      setStage('error')
      return
    }

    const now = assessFrame(video)
    if (!now.ok) {
      setError(now.problem || 'Could not read the camera picture.')
      setStage('error')
      return
    }

    // Capture a fresh frame (downscaled) to send for the server-side face check.
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 640 / video.videoWidth)
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const image = canvas.toDataURL('image/jpeg', 0.8)

    setStage('captured')
    try {
      const res = await voterFetch('/api/ballots/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginProof: proof, image }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not start your voting session.')
        setStage('error')
        if (res.status === 401) sessionStorage.removeItem('naijavote_login_proof')
        return
      }
      sessionStorage.removeItem('naijavote_login_proof')
      sessionStorage.setItem('naijavote_voting_token', data.token)
      navigate('/vote/eligibility')
    } catch {
      setError('Could not reach the server.')
      setStage('error')
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center gap-3">
        <EmblemLogo className="h-9 w-9" />
        <p className="font-serif text-lg font-semibold text-ink">One more check</p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-6">
        <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-full bg-ink/5">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-green-700/40" />
        </div>
        <p className="mt-5 text-center text-sm text-ink/70">
          {stage === 'requesting' && 'Requesting camera access…'}
          {stage === 'denied' && 'Camera access is required to vote — enable it and reload.'}
          {stage === 'live' && (quality.problem || quality.hint || 'Look at the camera and hold still.')}
          {stage === 'captured' && 'Checking your face and starting your voting session…'}
          {stage === 'error' && error}
        </p>
        {stage === 'live' && (
          <button
            onClick={confirmAndContinue}
            disabled={!quality.ok}
            className="mt-5 w-full rounded-full bg-green-700 py-2.5 font-semibold text-white hover:bg-green-900 disabled:opacity-50"
          >
            Confirm face match
          </button>
        )}
        {stage === 'error' && (
          <button
            onClick={() => setStage('live')}
            className="mt-5 w-full rounded-full border border-ink/20 py-2.5 font-semibold text-ink"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
