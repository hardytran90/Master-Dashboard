// core/prisma.js

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// core/prisma.js → src → api → apps → root, need 4 levels ../
config({ path: path.resolve(__dirname, '../../../../.env') });

import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis;

const dbUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ''),
  connectTimeout: 5000,
  idleTimeout: 300,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, 
    log: ['query', 'warn', 'error'],
   });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}