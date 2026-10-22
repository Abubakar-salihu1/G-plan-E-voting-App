import test from 'node:test'
import assert from 'node:assert/strict'
import { passwordProblem, isEmail, normEmail, isUuid, isTimezone } from '../src/lib/validate.js'

test('password policy', () => {
  assert.ok(passwordProblem('short1'))
  assert.ok(passwordProblem('onlyletterslong'))
  assert.ok(passwordProblem('a1' + 'x'.repeat(80))) // >72 bytes
  assert.equal(passwordProblem('Sufficient123'), null)
})

test('email / uuid / timezone helpers', () => {
  assert.equal(normEmail('  Foo@Bar.COM '), 'foo@bar.com')
  assert.equal(isEmail('a@b.co'), true)
  assert.equal(isEmail('nope'), false)
  assert.equal(isUuid('3f2b8c1e-0b7a-4b8e-9d52-1c3a4e5f6a7b'), true)
  assert.equal(isUuid('x'), false)
  assert.equal(isTimezone('Africa/Lagos'), true)
  assert.equal(isTimezone('Mars/Base'), false)
})
