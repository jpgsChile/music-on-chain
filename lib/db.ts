import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const boundPools = new Map<string, pg.Pool>();

/** Test-only. Binds an in-process PostgreSQL pool to a URL the client can reopen. */
export function bindPostgresPool(url: string, pool: pg.Pool) {
  boundPools.set(url, pool);
}

export function takePostgresPool(url: string): pg.Pool | undefined {
  const pool = boundPools.get(url);
  boundPools.delete(url);
  return pool;
}

export function createPrismaClient(url = process.env.DATABASE_URL) {
  const connectionString = url?.trim();
  if (!connectionString || connectionString.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
  }
  const bound = boundPools.get(connectionString);
  const pool = bound ?? new Pool({ connectionString, max: 10 });
  const adapter = new PrismaPg(pool, { disposeExternalPool: !bound });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** Test-only: point the process singleton at an isolated PostgreSQL client. */
export function installPrismaClient(client: PrismaClient) {
  globalForPrisma.prisma = client;
}
