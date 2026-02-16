import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env and then .env.local (local overrides)
config();
config({ path: ".env.local" });

// Fallback for environments where DATABASE_URL is not set yet (e.g. Vercel install).
// prisma generate only needs a valid URL shape; runtime uses real DATABASE_URL from env.
const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
