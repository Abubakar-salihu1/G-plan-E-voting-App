import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'

const ISSUER = 'naijavote'

// Every token carries a `typ` claim. Admin, voter and short-lived purpose
// tokens are NOT interchangeable — a voter token can never pass admin checks.
const TTL = { admin: '1h', voter: '2h' }

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

// Used to keep login timing the same whether or not the account exists.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

function sign(payload, typ, expiresIn) {
  return jwt.sign({ ...payload, typ }, config.jwtSecret, {
    algorithm: 'HS256',
    issuer: ISSUER,
    expiresIn,
  })
}

export const signAdminToken = (admin) => sign({ sub: admin.id, tv: admin.tokenVersion ?? 0 }, 'admin', TTL.admin)
export const signVoterToken = (voter) => sign({ sub: voter.id, tv: voter.tokenVersion ?? 0 }, 'voter', TTL.voter)
/** Short-lived, single-purpose token (e.g. 'admin-mfa-setup', 'vote-login'). */
export const signPurposeToken = (sub, typ, expiresIn) => sign({ sub }, typ, expiresIn)

/** Verifies signature, issuer, expiry AND that the token is of the expected type. */
export function verifyToken(token, expectedTyp) {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER })
  if (payload.typ !== expectedTyp) throw new Error('Wrong token type')
  return payload
}
