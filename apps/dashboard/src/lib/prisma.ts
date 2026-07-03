// File Location: src/lib/prisma.ts
// This file initializes the Prisma Client using the official PostgreSQL adapter.
// It uses a global variable to prevent connection exhaustion during Next.js hot-reloads.

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Grab the URL from the .env file we just copied over
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Attach Prisma to the global namespace in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}