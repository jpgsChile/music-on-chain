import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config();
config({ path: ".env.local" });

/**
 * CLI connection (generate / migrate).
 * Migrations need a direct PostgreSQL session. Supabase pooler URLs belong in
 * DATABASE_URL at runtime; set DIRECT_URL to the non-pooled connection.
 * Generate does not open this URL. The placeholder only lets generate run
 * before a database exists.
 */
const databaseUrl =
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "postgresql://postgres:postgres@127.0.0.1:5432/moc";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl.startsWith("file:")
      ? "postgresql://postgres:postgres@127.0.0.1:5432/moc"
      : databaseUrl,
  },
});
