import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="flag-band">
        <span /><span /><span />
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink/60">
        <p className="max-w-2xl">
          NaijaVote is a conceptual design project exploring secure digital voting for Nigeria.
          It is not affiliated with, endorsed by, or authorised by INEC or the Government of
          Nigeria.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/help" className="hover:text-ink">Help centre</Link>
          <Link to="/accessibility" className="hover:text-ink">Accessibility</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <Link to="/transparency" className="hover:text-ink">Report an incident</Link>
          <Link to="/leadership" className="hover:text-ink">Commission leadership</Link>
          <Link to="/admin/login" className="hover:text-ink">Admin portal</Link>
        </div>
      </div>
    </footer>
  )
}
