// Merges server/email.settings into server/.env (replacing any old email lines),
// creates .env first if it doesn't exist, then deletes email.settings so the
// password is not left lying around in the project folder.
import fs from 'node:fs'
import { execSync } from 'node:child_process'

if (!fs.existsSync('email.settings')) {
  console.log('email.settings not found — nothing to do.')
  process.exit(0)
}
if (!fs.existsSync('.env')) execSync('node scripts/setup-env.js', { stdio: 'inherit' })

const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']
const kept = fs
  .readFileSync('.env', 'utf8')
  .split('\n')
  .filter((line) => !keys.some((k) => line.startsWith(`${k}=`)))
  .join('\n')
  .replace(/\n+$/, '')
const add = fs.readFileSync('email.settings', 'utf8').trim()
fs.writeFileSync('.env', `${kept}\n\n${add}\n`, { mode: 0o600 })
fs.unlinkSync('email.settings')
console.log('Email settings added to server/.env')
