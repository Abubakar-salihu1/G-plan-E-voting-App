// Sends one test email using the SMTP settings in .env and explains, in plain
// words, exactly why it failed if it does.   Usage:  npm run test:email you@gmail.com
import 'dotenv/config'
import nodemailer from 'nodemailer'

const to = process.argv[2]
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env
if (!to) { console.log('Usage: npm run test:email your@email.com'); process.exit(1) }
for (const [k, v] of Object.entries({ SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM })) {
  if (!v) { console.log(`MISSING: ${k} is empty in server/.env. Run: node scripts/add-email.js`); process.exit(1) }
}
const port = Number(SMTP_PORT) || 587
console.log(`Sending test email via ${SMTP_HOST}:${port} as ${SMTP_USER} to ${to} ...`)

const t = nodemailer.createTransport({
  host: SMTP_HOST, port, secure: port === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s+/g, '') },
  connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
})
try {
  await t.verify()
  const info = await t.sendMail({ from: MAIL_FROM, to, subject: 'NaijaVote test email', text: 'If you can read this, NaijaVote email works.' })
  console.log('\nSUCCESS. Gmail accepted the message:', info.response)
  console.log('Check the inbox AND Spam of', to)
} catch (err) {
  const msg = String(err?.response || err?.message || err)
  console.log('\nFAILED:', msg)
  if (/535|Username and Password not accepted|BadCredentials/i.test(msg)) console.log('\nMEANING: Gmail rejected the app password. Make a NEW App Password (Google Account > Security > App passwords), then put it in email.settings and run: node scripts/add-email.js')
  else if (/534|Application-specific/i.test(msg)) console.log('\nMEANING: 2-Step Verification must be ON, and you must use an App Password, not your normal password.')
  else if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ESOCKET|ECONNECTION/i.test(msg)) console.log('\nMEANING: This machine cannot reach Gmail (network/port). Check SMTP_HOST=smtp.gmail.com and SMTP_PORT=587.')
  else if (/550|553|invalid.*recipient/i.test(msg)) console.log('\nMEANING: Gmail refused the recipient address. Check the email you typed.')
  process.exit(1)
}
