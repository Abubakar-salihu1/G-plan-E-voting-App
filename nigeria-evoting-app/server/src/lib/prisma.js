import { PrismaClient } from '@prisma/client'

// A single shared Prisma client for the whole server — creating a new one
// per request would exhaust database connections.
export const prisma = new PrismaClient()
