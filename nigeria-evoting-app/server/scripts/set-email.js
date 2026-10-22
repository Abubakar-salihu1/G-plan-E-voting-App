// Writes Gmail SMTP settings into server/.env. Values come from environment variables
// (EMAIL_ADDR, EMAIL_PASS) so the password never appears in a command line or file.
import fs from 'node:fs'

const addr = (process.env.EMAIL_ADDR || '').trim()
const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '')
if (!addr.includes('@') || pass.length < 8) {
  console.log('Skipped: need a valid email address and app password.')
  process.exit(1)
}
const values = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: addr,
  SMTP_PASS: pass,
  MAIL_FROM: `"NaijaVote <${addr}>"`,
}
let env = fs.readFileSync('.env', 'utf8')
for (const [k, v] of Object.entries(values)) {
  const line = `${k}=${v}`
  env = new RegExp(`^${k}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${k}=.*$`, 'm'), () => line) : env.trimEnd() + '\n' + line + '\n'
}
fs.writeFileSync('.env', env, { mode: 0o600 })
console.log('Email settings saved to server/.env')
