import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'superadmin@naijavote.test').toLowerCase()

  const existing = await prisma.admin.findUnique({ where: { email } })
  if (existing) {
    console.log(`Super-admin already exists: ${email}`)
    return
  }

  // No hard-coded password ships with the project: use SEED_ADMIN_PASSWORD if
  // you set one, otherwise a random one is generated and printed ONCE below.
  const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url') + '9a'
  await prisma.admin.create({
    data: { email, staffId: 'SA-0001', passwordHash: await bcrypt.hash(password, 12), role: 'super-admin' },
  })

  console.log('Seeded first super-admin account:')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log('Save this now — it is not stored anywhere. On first sign-in you will be')
  console.log('asked to enrol an authenticator app (MFA is mandatory for admins).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
