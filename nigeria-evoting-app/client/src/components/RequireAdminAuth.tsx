import { Navigate } from 'react-router-dom'
import { isAdminSignedIn } from '../lib/adminAuth'

export default function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  if (!isAdminSignedIn()) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}
