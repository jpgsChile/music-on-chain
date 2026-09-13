import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPrismaClient, installPrismaClient } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(__dirname, "../..");

let templateFile: string | null = null;

function ensureTemplate(): string {
  if (templateFile && fs.existsSync(templateFile)) return templateFile;
  const file = path.join(os.tmpdir(), `moc-ledger-template-${process.pid}.db`);
  const url = `file:${file}`;
  execSync(`npx prisma db push --url ${JSON.stringify(url)}`, {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  templateFile = file;
  return file;
}

export async function openIsolatedPrisma(): Promise<{
  url: string;
  file: string;
  client: PrismaClient;
}> {
  const file = path.join(
    os.tmpdir(),
    `moc-ledger-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`
  );
  fs.copyFileSync(ensureTemplate(), file);
  const url = `file:${file}`;
  const client = createPrismaClient(url);
  installPrismaClient(client);
  return { url, file, client };
}

export async function reopenPrisma(url: string): Promise<PrismaClient> {
  const client = createPrismaClient(url);
  installPrismaClient(client);
  return client;
}

export async function closeIsolatedPrisma(client: PrismaClient, file?: string) {
  await client.$disconnect();
  if (file && fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}
