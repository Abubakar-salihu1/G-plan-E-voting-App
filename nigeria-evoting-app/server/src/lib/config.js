// Central, validated configuration. Imported after env.js has loaded .env.
// Fails fast at startup instead of running with weak/missing secrets.

const isProd = process.env.NODE_ENV === 'production'
const KNOWN_WEAK = new Set(['dev-only-secret-change-before-any-real-deployment', 'changeme', 'secret'])

function fail(msg) {
  throw new Error(`[config] ${msg}`)
}

function secret(name, minLength = 32) {
  const v = process.env[name]
  if (!v) fail(`${name} is not set — copy server/.env.example to server/.env and fill it in.`)
  if (v.length < minLength) fail(`${name} must be at least ${minLength} characters.`)
  if (KNOWN_WEAK.has(v)) fail(`${name} is a known placeholder value — generate a real one.`)
  return v
}

const dataKeyHex = process.env.DATA_ENCRYPTION_KEY
if (!dataKeyHex || !/^[0-9a-fA-F]{64}$/.test(dataKeyHex)) {
  fail('DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate: openssl rand -hex 32')
}

const faceProvider = process.env.FACE_PROVIDER || 'demo'
// A PUBLIC DEMO may run the simulated face/NIN checks, but only when ALLOW_DEMO=true is set on purpose.
// The site then shows a "demo" banner. A real election must use a licensed face provider instead.
const allowDemo = process.env.ALLOW_DEMO === 'true'
if (isProd && faceProvider === 'demo' && !allowDemo) {
  fail('FACE_PROVIDER=demo is not allowed in production: it performs NO real liveness or face matching. (For a public demo only, set ALLOW_DEMO=true.)')
}

// Email (SMTP). When SMTP_HOST + MAIL_FROM are set, OTP and invite codes are
// emailed and are NOT echoed back in API responses.
const smtpHost = process.env.SMTP_HOST || ''
const mailFrom = process.env.MAIL_FROM || ''
if (smtpHost && !mailFrom) fail('MAIL_FROM must be set when SMTP_HOST is set (e.g. "NaijaVote <you@example.com>").')
const smtpPort = Number(process.env.SMTP_PORT) || 587

// Passkeys (WebAuthn) are bound to the exact website address the voter uses.
// In GitHub Codespaces this is worked out automatically; elsewhere set
// WEBAUTHN_ORIGIN (e.g. https://vote.example.ng). WEBAUTHN_RP_ID defaults to its hostname.
const codespace = process.env.CODESPACE_NAME
const codespaceDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'
// On Render, RENDER_EXTERNAL_URL is the site's own https address and is set automatically.
const webauthnOrigin =
  process.env.WEBAUTHN_ORIGIN ||
  process.env.RENDER_EXTERNAL_URL ||
  (codespace ? `https://${codespace}-5173.${codespaceDomain}` : process.env.CLIENT_ORIGIN || 'http://localhost:5173')
if (isProd && !process.env.WEBAUTHN_ORIGIN && !process.env.RENDER_EXTERNAL_URL) fail('WEBAUTHN_ORIGIN must be set in production (the https address voters use).')
let webauthnRpId = process.env.WEBAUTHN_RP_ID
try {
  webauthnRpId = webauthnRpId || new URL(webauthnOrigin).hostname
} catch {
  fail('WEBAUTHN_ORIGIN must be a full URL such as https://vote.example.ng')
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  jwtSecret: secret('JWT_SECRET'),
  hashPepper: secret('HASH_PEPPER'),
  dataKeyHex,
  clientOrigin: process.env.CLIENT_ORIGIN || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173',
  trustProxy: process.env.TRUST_PROXY === 'true',
  faceProvider,
  isDemo: faceProvider === 'demo',
  // In production, OTP/invite codes must be delivered out-of-band; they are
  // only ever echoed back in API responses in non-production environments.
  // Demo escape hatch: if email cannot be sent from the host, codes can be shown on screen — DEMO ONLY.
  devDelivery: !isProd || (allowDemo && process.env.DEMO_SHOW_CODES === 'true'),
  mail: {
    enabled: !!(smtpHost && mailFrom),
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: mailFrom,
  },
  webauthn: { name: 'NaijaVote', id: webauthnRpId, origin: webauthnOrigin },
  // When true, completing face verification does NOT auto-verify the voter —
  // an admin must approve them in the verification queue.
  requireAdminApproval: process.env.REQUIRE_ADMIN_APPROVAL === 'true',
}
