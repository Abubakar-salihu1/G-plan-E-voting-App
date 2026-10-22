import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  '/': 'NaijaVote — Secure voting for Nigeria',
  '/leadership': 'Commission Leadership — NaijaVote',
  '/transparency': 'Observer & Transparency Portal — NaijaVote',
  '/help': 'Help Centre — NaijaVote',
  '/accessibility': 'Accessibility — NaijaVote',
  '/privacy': 'Privacy — NaijaVote',
  '/dashboard': 'Your Dashboard — NaijaVote',
  '/signup': 'Create Account — NaijaVote',
  '/login': 'Sign In — NaijaVote',
  '/verify/nin': 'Verify NIN — NaijaVote',
  '/verify/otp': 'Verify OTP — NaijaVote',
  '/verify/mfa': 'Set Up MFA — NaijaVote',
  '/verify/voter-card': 'Verify Voter Card — NaijaVote',
  '/verify/face': 'Face & Liveness Check — NaijaVote',
  '/verify/complete': 'Verification Submitted — NaijaVote',
  '/vote/login': 'Confirm It\u2019s You — NaijaVote',
  '/vote/liveness': 'Face Check — NaijaVote',
  '/vote/eligibility': 'Confirm Eligibility — NaijaVote',
  '/vote/ballot': 'Your Ballot — NaijaVote',
  '/vote/review': 'Review Your Votes — NaijaVote',
  '/vote/receipt': 'Vote Receipt — NaijaVote',
  '/admin/login': 'Admin Sign In — NaijaVote',
  '/admin/signup': 'Activate Admin Account — NaijaVote',
  '/admin/manage': 'Manage Accounts — NaijaVote Admin',
  '/admin/dashboard': 'Admin Dashboard — NaijaVote',
  '/admin/elections': 'Election Setup — NaijaVote Admin',
  '/admin/parties': 'Party & Candidate Onboarding — NaijaVote Admin',
  '/admin/voters': 'Voter Verification Queue — NaijaVote Admin',
  '/admin/incidents': 'Incident Management — NaijaVote Admin',
  '/admin/notifications': 'Notification Broadcast — NaijaVote Admin',
  '/admin/audit-log': 'Audit Log — NaijaVote Admin',
}

export default function PageTitle() {
  const location = useLocation()

  useEffect(() => {
    document.title = titles[location.pathname] ?? 'NaijaVote'
  }, [location.pathname])

  return null
}
