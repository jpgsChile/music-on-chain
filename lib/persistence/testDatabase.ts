import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { PrismaClient } from "@prisma/client";
import { bindPostgresPool, createPrismaClient, installPrismaClient, takePostgresPool } from "@/lib/db";
import { createPglitePool } from "@/lib/persistence/pglitePool";

const ROOT = path.resolve(__dirname, "../..");
const MIGRATIONS = path.join(ROOT, "prisma/migrations");

let templateSql: string | null = null;
let sequence = 0;

function baselineSql(): string {
  if (!templateSql) {
    const files = fs
      .readdirSync(MIGRATIONS)
      .filter((name) => fs.existsSync(path.join(MIGRATIONS, name, "migration.sql")))
      .sort()
      .map((name) => fs.readFileSync(path.join(MIGRATIONS, name, "migration.sql"), "utf8"));
    templateSql = files.join("\n");
  }
  return templateSql;
}

export async function openIsolatedPrisma(): Promise<{
  url: string;
  file: string;
  client: PrismaClient;
}> {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(baselineSql());
  const url = `pglite:moc-${process.pid}-${++sequence}`;
  const pool = createPglitePool(db);
  bindPostgresPool(url, pool);
  const client = createPrismaClient(url);
  installPrismaClient(client);
  return { url, file: url, client };
}

export async function reopenPrisma(url: string): Promise<PrismaClient> {
  const client = createPrismaClient(url);
  installPrismaClient(client);
  return client;
}

export async function closeIsolatedPrisma(client: PrismaClient, file?: string) {
  await client.$disconnect();
  if (file?.startsWith("pglite:")) {
    await takePostgresPool(file)?.end();
  }
}
