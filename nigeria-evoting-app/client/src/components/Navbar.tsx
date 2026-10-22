import { Link } from 'react-router-dom'
import EmblemLogo from './EmblemLogo'

export default function Navbar() {
  return (
    <header>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 text-ink">
          <EmblemLogo className="h-9 w-9" />
          <span className="font-serif text-lg font-semibold tracking-tight">NaijaVote</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/#how-it-works" className="hidden text-sm font-medium text-ink/80 hover:text-ink sm:inline">
            How it works
          </Link>
          <Link to="/#security" className="hidden text-sm font-medium text-ink/80 hover:text-ink sm:inline">
            Security
          </Link>
          <Link to="/leadership" className="hidden text-sm font-medium text-ink/80 hover:text-ink sm:inline">
            Leadership
          </Link>
          <Link to="/candidates" className="hidden text-sm font-medium text-ink/80 hover:text-ink sm:inline">
            Candidates
          </Link>
          <Link to="/transparency" className="hidden text-sm font-medium text-ink/80 hover:text-ink sm:inline">
            Transparency
          </Link>
          <Link to="/login" className="text-sm font-semibold text-green-700 hover:text-green-900">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
          >
            Register to vote
          </Link>
        </div>
      </nav>
      {/* flag-style ribbon band */}
      <div className="flag-band">
        <span /><span /><span />
      </div>
    </header>
  )
}
