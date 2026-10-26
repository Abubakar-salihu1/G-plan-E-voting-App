import { config } from './config.js'
import { HttpError } from './http.js'

// Delivery of one-time codes.
//  - SMTP configured (SMTP_HOST + MAIL_FROM in .env): the code is EMAILED and is
//    never returned to the caller.
//  - Not configured, non-production: the code is logged and echoed back (dev only).
//  - Not configured, production: refused, rather than leaking the code in a response.
// There is no SMS provider wired in; only email is sent.

let transporter
async function getTransporter() {
  if (!transporter) {
    const { default: nodemailer } = await import('nodemailer')
    const { host, port, secure, user, pass } = config.mail
    transporter = nodemailer.createTransport({
      host, port, secure,
      auth: user ? { user, pass } : undefined,
      // Give up quickly: some hosts silently block outgoing mail ports, and a voter should not wait minutes.
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
    })
  }
  return transporter
}

function buildMessage(kind, code) {
  if (kind === 'Invite') {
    return {
      subject: 'Your NaijaVote admin invite',
      text:
        `You have been invited to the NaijaVote Commission Admin Portal.\n\n` +
        `Your invite code: ${code}\n\n` +
        `Open the admin portal, choose "Activate an invite", and enter this code. ` +
        `If you were not expecting this, ignore this email.`,
    }
  }
  if (kind === 'Reset') {
    return {
      subject: 'Reset your NaijaVote password',
      text:
        `Your NaijaVote password-reset code is: ${code}\n\n` +
        `It expires in 15 minutes. If you did not ask to reset your password, ignore this email — ` +
        `your password has not changed.`,
    }
  }
  return {
    subject: 'Your NaijaVote verification code',
    text:
      `Your NaijaVote verification code is: ${code}\n\n` +
      `It expires in 5 minutes. Never share this code with anyone. ` +
      `If you did not request it, ignore this email.`,
  }
}

export async function deliverCode(kind, to, code) {
  if (config.mail.enabled) {
    const { subject, text } = buildMessage(kind, code)
    try {
      const t = await getTransporter()
      await t.sendMail({ from: config.mail.from, to, subject, text })
    } catch (err) {
      console.error(`[mail] failed to send ${kind} email:`, err?.message || err)
      // Prototype hosting that cannot send email: show the code on screen instead of failing (never in real production).
      if (config.devDelivery) {
        console.warn(`[mail] falling back to on-screen code for ${kind}`)
        return { devOnlyCode: code, emailFailed: true }
      }
      throw new HttpError(502, 'We could not send the email right now. Please try again shortly.')
    }
    return { emailed: true }
  }
  if (config.devDelivery) {
    console.log(`[dev delivery] ${kind} for ${to}: ${code}`)
    return { devOnlyCode: code }
  }
  throw new HttpError(503, `${kind} delivery is not configured on this server.`)
}

// Best-effort security notice ("your MFA was reset", "your password changed").
// Never throws: a mail problem must not block the action that triggered it.
export async function sendNotice(to, subject, text) {
  try {
    if (config.mail.enabled) {
      const t = await getTransporter()
      await t.sendMail({ from: config.mail.from, to, subject, text })
    } else if (config.devDelivery) {
      console.log(`[dev notice] to ${to}: ${subject}`)
    }
  } catch (err) {
    console.error('[mail] could not send notice:', err?.message || err)
  }
}
