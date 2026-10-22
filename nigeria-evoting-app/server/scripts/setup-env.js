// Creates server/.env from .env.example with freshly generated random secrets.
// Safe to re-run: it never overwrites an existing .env.
import fs from 'node:fs'
import crypto from 'node:crypto'

if (fs.existsSync('.env')) {
  console.log('.env already exists — leaving it untouched.')
  process.exit(0)
}
const rnd = (n) => crypto.randomBytes(n).toString('base64')
const filled = fs
  .readFileSync('.env.example', 'utf8')
  .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${rnd(48)}`)
  .replace(/^HASH_PEPPER=.*$/m, `HASH_PEPPER=${rnd(48)}`)
  .replace(/^DATA_ENCRYPTION_KEY=.*$/m, `DATA_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`)
fs.writeFileSync('.env', filled, { mode: 0o600 })
console.log('Created server/.env with new random secrets.')
