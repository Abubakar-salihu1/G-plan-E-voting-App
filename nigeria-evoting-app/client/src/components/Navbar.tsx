import { Link } from 'react-router-dom'
import EmblemLogo from './EmblemLogo'

export default function Navbar() {
  return (
    <header>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-ink sm:gap-3">
          <EmblemLogo className="h-9 w-9" />
          <span className="whitespace-nowrap font-serif text-lg font-semibold tracking-tight">NaijaVote</span>
        </Link>
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
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
          <Link to="/login" className="whitespace-nowrap text-sm font-semibold text-green-700 hover:text-green-900">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="whitespace-nowrap rounded-full bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-900 sm:px-4"
          >
            <span className="sm:hidden">Register</span>
            <span className="hidden sm:inline">Register to vote</span>
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
