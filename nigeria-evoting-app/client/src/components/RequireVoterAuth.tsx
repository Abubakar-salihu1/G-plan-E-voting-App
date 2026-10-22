import { Navigate } from 'react-router-dom'
import { isVoterSignedIn } from '../lib/voterAuth'

export default function RequireVoterAuth({ children }: { children: React.ReactNode }) {
  if (!isVoterSignedIn()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
