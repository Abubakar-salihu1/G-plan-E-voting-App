import test from 'node:test'
import assert from 'node:assert/strict'
import { rateLimit } from '../src/lib/rateLimit.js'

function run(limiter, req) {
  let status = 200
  const res = { set() {}, status(c) { status = c; return this }, json() {} }
  limiter(req, res, () => {})
  return status
}

test('blocks after max hits per key, separately per key', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 3, key: (r) => r.k })
  for (let i = 0; i < 3; i++) assert.equal(run(limiter, { k: 'a' }), 200)
  assert.equal(run(limiter, { k: 'a' }), 429)
  assert.equal(run(limiter, { k: 'b' }), 200)
})
