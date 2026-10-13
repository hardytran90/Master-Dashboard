
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// core/prisma.js → src → api → apps → root, need 4 levels ../
config({ path: path.resolve(__dirname, '../../../../.env') });

const globalForPrisma = globalThis;
const isProd = process.env.NODE_ENV === 'production';
const useSsl = process.env.DB_SSL === 'true';

const dbUrl = new URL(process.env.DATABASE_URL);
console.log('[prisma] connecting to', dbUrl.hostname, 'ssl:', useSsl);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ''),
  allowPublicKeyRetrieval: true,
  connectTimeout: 5000,
  idleTimeout: 300,
  connectionLimit: 5, // keep the pool small for serverless + TiDB Starter connection limits
  ssl: useSsl ? { rejectUnauthorized: true } : undefined,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, 
    log: isProd ? ['warn', 'error'] : ['query', 'warn', 'error'],
   });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}