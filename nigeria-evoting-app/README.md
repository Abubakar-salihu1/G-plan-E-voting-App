# NaijaVote — Nigeria 2027 E-Voting Concept

⚠️ Conceptual project only. Not affiliated with, endorsed by, or authorised by INEC or the
Government of Nigeria.

## Structure

```
nigeria-evoting-app/
  client/   React + Vite + Tailwind frontend — every screen is built and wired up
  server/   Express backend + PostgreSQL (via Prisma) — auth and elections/parties are real;
            a few routes are still stubs with implementation notes (see below)
```

## First-time setup

1. **Database** (Docker, once):
```
docker run -d --name naijavote-db \
  -e POSTGRES_USER=naijavote -e POSTGRES_PASSWORD=naijavote_dev_pw -e POSTGRES_DB=naijavote \
  -p 5432:5432 postgres:16
```
2. **Secrets** — no secrets ship in this project. After `npm install`, run `npm run setup:env` in `server/`:
   it creates `server/.env` with fresh random `JWT_SECRET`, `HASH_PEPPER` and `DATA_ENCRYPTION_KEY`
   (or fill `.env.example` by hand). The server refuses to start with missing/placeholder secrets.
3. **Server** (this version changed the schema, so reset the dev database once):
```
cd server
npm install
npm run setup:env             # generates server/.env with random secrets
npx prisma migrate reset     # dev only: drops & recreates tables from the new schema
npm run db:seed              # prints a RANDOM super-admin password — save it, it is shown once
npm test                     # unit tests (TOTP, rate limiting, crypto, tokens, validation)
npm run dev
```
4. **Client**: `cd client && npm install && npm run dev` → http://localhost:5173

First admin sign-in: leave the authenticator field blank; after the password is checked you are walked
through enrolling an authenticator app (MFA is mandatory for admins).

To open voting: an admin creates an election and parties, then **locks the roster**. Voting is open only
while the roster is locked AND the current time is inside the election's window.

## What is real now

- **Auth**: bcrypt passwords; typed JWTs (a voter token can never act as an admin token); admin role and
  active status re-read from the database on every request; per-IP rate limits plus per-account lockout.
- **MFA**: real TOTP (RFC 6238, replay-protected). Mandatory for admins; optional for voters and then enforced
  at vote time. Secrets are AES-256-GCM encrypted at rest.
- **OTP**: CSPRNG codes, stored only as keyed hashes, 5-minute expiry, 5 attempts, resend cooldown. Codes are
  returned in the API response **only outside production**.
- **Identity data**: NIN, voter-card number and face data are stored only as keyed HMACs (server-side pepper),
  with DB-level uniqueness. Verified accounts are frozen.
- **Voting**: one token row per voter per election, forever (a spent token can never be re-issued). Spending is
  a conditional UPDATE inside one transaction, so concurrent double-submits cannot both succeed. The server
  checks that every election is open, selections are unique, and there is one choice per contest.
- **Anonymity**: Ballot rows contain no voter id and no token, and their timestamp is rounded to the hour.
  The voter's receipt is stored only as a hash, unlinked to any ballot (`GET /api/ballots/receipt/:code`).
- **Audit log**: append-only, hash-chained, serialised with a Postgres advisory lock; `GET /api/audit-log` and
  `/verify` (recomputes the whole chain). Ballot events are logged with actor `system`, never a voter.
- **Uploads**: PNG/JPEG/WebP only, type sniffed from file bytes, server-generated names, 2 MB limit.
- Incidents, notifications, voter verification queue and tally are all backed by the database.

## Known limits (honest list)

- **Face verification is a stub.** `FACE_PROVIDER=demo` performs no liveness check or face matching, and the
  server refuses to start with it in production. Plug a real provider into `server/src/lib/faceProvider.js`.
- **No email/SMS provider**: OTP codes, admin invites and broadcasts cannot be delivered. In production these
  endpoints refuse rather than leak codes. Broadcasts are recorded only.
- **No live NIMC/INEC lookups**: any well-formed NIN/PVC is accepted; only uniqueness is enforced.
- **Voter state/LGA is not captured**, so eligibility by constituency is not enforced.
- Ballot anonymity is application-level: someone with raw database + server log access could still try
  timing/insert-order correlation. A real deployment needs cryptographic mixing/blind tokens and audits.
- Rate limiting is in-memory (single instance). Use Redis if you run more than one server.
- Live tallies during voting are public by design here; real systems usually withhold them until polls close.
