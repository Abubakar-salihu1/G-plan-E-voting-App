import './env.js' // must stay the first import — see comment in that file

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './lib/config.js'
import { errorHandler } from './lib/http.js'
import { rateLimit } from './lib/rateLimit.js'
import authRoutes from './routes/auth.js'
import electionsRoutes from './routes/elections.js'
import tallyRoutes from './routes/tally.js'
import adminRoutes from './routes/admin.js'
import ballotsRoutes from './routes/ballots.js'
import votersRoutes from './routes/voters.js'
import incidentsRoutes from './routes/incidents.js'
import notificationsRoutes from './routes/notifications.js'
import auditLogRoutes from './routes/auditLog.js'
import uploadsRoutes, { UPLOAD_DIR } from './routes/uploads.js'

const app = express()
app.disable('x-powered-by')
if (config.trustProxy) app.set('trust proxy', 1) // so rate limits see real client IPs behind a proxy

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: config.clientOrigin })) // only the real frontend, not the whole web

// Face captures are the only large bodies; everything else is capped at 50 KB.
app.use('/api/auth/verify-face', express.json({ limit: '3mb' }))
app.use('/api/ballots/token', express.json({ limit: '3mb' }))
app.use(express.json({ limit: '50kb' }))

// Broad safety net for writes; sensitive endpoints add their own tighter limits.
app.use('/api', rateLimit({ windowMs: 15 * 60_000, max: 600, skip: (req) => req.method === 'GET' }))

app.use('/uploads', express.static(UPLOAD_DIR, { dotfiles: 'deny', index: false }))

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'nigeria-evoting-server' }))

app.use('/api/auth', authRoutes)
app.use('/api/elections', electionsRoutes)
app.use('/api/tally', tallyRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/ballots', ballotsRoutes)
app.use('/api/voters', votersRoutes)
app.use('/api/incidents', incidentsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/audit-log', auditLogRoutes)
app.use('/api/uploads', uploadsRoutes)

app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found.' }))
app.use(errorHandler)

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err))

app.listen(config.port, () => {
  console.log(`NaijaVote server listening on port ${config.port}`)
})
