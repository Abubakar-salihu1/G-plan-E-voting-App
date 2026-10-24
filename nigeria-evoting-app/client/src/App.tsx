import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import DemoBanner from './components/DemoBanner'
import Footer from './components/Footer'
import PageTitle from './components/PageTitle'
import Landing from './pages/Landing'
import Leadership from './pages/Leadership'
import Dashboard from './pages/Dashboard'
import Transparency from './pages/Transparency'
import HelpCentre from './pages/HelpCentre'
import Accessibility from './pages/Accessibility'
import Privacy from './pages/Privacy'
import VoteLogin from './pages/vote/VoteLogin'
import VoteLiveness from './pages/vote/VoteLiveness'
import EligibilityCheck from './pages/vote/EligibilityCheck'
import Ballot from './pages/vote/Ballot'
import ReviewVote from './pages/vote/ReviewVote'
import VoteReceipt from './pages/vote/VoteReceipt'
import AdminLogin from './pages/admin/AdminLogin'
import AdminSignup from './pages/admin/AdminSignup'
import RequireAdminAuth from './components/RequireAdminAuth'
import ManageAdmins from './pages/admin/ManageAdmins'
import AdminDashboard from './pages/admin/AdminDashboard'
import ElectionSetup from './pages/admin/ElectionSetup'
import PartyOnboarding from './pages/admin/PartyOnboarding'
import VoterRoll from './pages/admin/VoterRoll'
import Incidents from './pages/admin/Incidents'
import Notifications from './pages/admin/Notifications'
import AuditLog from './pages/admin/AuditLog'
import SignUp from './pages/onboarding/SignUp'
import Candidates from './pages/Candidates'
import ForgotPassword from './pages/ForgotPassword'
import SignIn from './pages/SignIn'
import RequireVoterAuth from './components/RequireVoterAuth'
import VerifyNin from './pages/onboarding/VerifyNin'
import VerifyOtp from './pages/onboarding/VerifyOtp'
import SetupMfa from './pages/onboarding/SetupMfa'
import VerifyVoterCard from './pages/onboarding/VerifyVoterCard'
import FacialCapture from './pages/onboarding/FacialCapture'
import VerificationComplete from './pages/onboarding/VerificationComplete'

export default function App() {
  return (
    <div className="min-h-screen px-[clamp(10px,3vw,60px)]">
      <PageTitle />
      <DemoBanner />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/leadership" element={<Leadership />} />
          <Route path="/dashboard" element={<RequireVoterAuth><Dashboard /></RequireVoterAuth>} />
          <Route path="/transparency" element={<Transparency />} />
          <Route path="/help" element={<HelpCentre />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/vote/login" element={<RequireVoterAuth><VoteLogin /></RequireVoterAuth>} />
          <Route path="/vote/liveness" element={<RequireVoterAuth><VoteLiveness /></RequireVoterAuth>} />
          <Route path="/vote/eligibility" element={<RequireVoterAuth><EligibilityCheck /></RequireVoterAuth>} />
          <Route path="/vote/ballot" element={<RequireVoterAuth><Ballot /></RequireVoterAuth>} />
          <Route path="/vote/review" element={<RequireVoterAuth><ReviewVote /></RequireVoterAuth>} />
          <Route path="/vote/receipt" element={<RequireVoterAuth><VoteReceipt /></RequireVoterAuth>} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/verify/nin" element={<RequireVoterAuth><VerifyNin /></RequireVoterAuth>} />
          <Route path="/verify/otp" element={<RequireVoterAuth><VerifyOtp /></RequireVoterAuth>} />
          <Route path="/verify/mfa" element={<RequireVoterAuth><SetupMfa /></RequireVoterAuth>} />
          <Route path="/verify/voter-card" element={<RequireVoterAuth><VerifyVoterCard /></RequireVoterAuth>} />
          <Route path="/verify/face" element={<RequireVoterAuth><FacialCapture /></RequireVoterAuth>} />
          <Route path="/verify/complete" element={<RequireVoterAuth><VerificationComplete /></RequireVoterAuth>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/admin/manage" element={<RequireAdminAuth><ManageAdmins /></RequireAdminAuth>} />
          <Route path="/admin/dashboard" element={<RequireAdminAuth><AdminDashboard /></RequireAdminAuth>} />
          <Route path="/admin/elections" element={<RequireAdminAuth><ElectionSetup /></RequireAdminAuth>} />
          <Route path="/admin/parties" element={<RequireAdminAuth><PartyOnboarding /></RequireAdminAuth>} />
          <Route path="/admin/voters" element={<RequireAdminAuth><VoterRoll /></RequireAdminAuth>} />
          <Route path="/admin/incidents" element={<RequireAdminAuth><Incidents /></RequireAdminAuth>} />
          <Route path="/admin/notifications" element={<RequireAdminAuth><Notifications /></RequireAdminAuth>} />
          <Route path="/admin/audit-log" element={<RequireAdminAuth><AuditLog /></RequireAdminAuth>} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
