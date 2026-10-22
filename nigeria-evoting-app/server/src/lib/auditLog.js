import crypto from 'node:crypto'
import { prisma } from './prisma.js'

// Postgres advisory lock key: serialises appends so two concurrent writers can
// never both read the same "last" entry and fork the chain.
const LOCK_KEY = 727274

const compute = (prevHash, actor, action, createdAt) =>
  crypto.createHash('sha256').update(prevHash + actor + action + createdAt.toISOString()).digest('hex')

async function write(tx, actor, action) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`
  const last = await tx.auditLogEntry.findFirst({ orderBy: { seq: 'desc' } })
  const prevHash = last?.hash ?? 'genesis'
  const createdAt = new Date()
  const hash = compute(prevHash, actor, action, createdAt)
  return tx.auditLogEntry.create({ data: { actor, action, prevHash, hash, createdAt } })
}

/** Pass `tx` to append inside an existing transaction (atomic with the action). */
export function appendAuditLog(actor, action, tx) {
  return tx ? write(tx, actor, action) : prisma.$transaction((t) => write(t, actor, action))
}

/** Re-walks the whole chain and reports the first broken entry, if any. */
export async function verifyAuditChain() {
  let expectedPrev = 'genesis'
  let count = 0
  let cursor = 0
  for (;;) {
    const batch = await prisma.auditLogEntry.findMany({
      where: { seq: { gt: cursor } },
      orderBy: { seq: 'asc' },
      take: 500,
    })
    if (batch.length === 0) break
    for (const e of batch) {
      const ok = e.prevHash === expectedPrev && e.hash === compute(e.prevHash, e.actor, e.action, e.createdAt)
      if (!ok) return { valid: false, entries: count, brokenAtSeq: e.seq }
      expectedPrev = e.hash
      count += 1
      cursor = e.seq
    }
  }
  return { valid: true, entries: count, headHash: expectedPrev }
}
