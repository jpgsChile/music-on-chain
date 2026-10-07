/**
 * Loads only .env.hackathon-rc.local, proves the target, then migrates and seeds.
 * Does not read .env.local. Does not print credentials.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { assertHackathonRcTarget, assertOperatorLabel, RC_NEON_PROJECT_ID, RC_TARGET } from "./target-guard.mjs";

function parseEnvFile(path) {
  const env = {};
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 0) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, index)] = value;
  }
  return env;
}

const file = parseEnvFile(".env.hackathon-rc.local");
if (file.NEON_PROJECT_ID !== RC_NEON_PROJECT_ID) {
  console.error("NEON_PROJECT_MISMATCH");
  process.exit(1);
}
assertOperatorLabel(RC_TARGET);
const database = assertHackathonRcTarget(file.DATABASE_URL, "DATABASE_URL");
const direct = assertHackathonRcTarget(file.DATABASE_URL_UNPOOLED, "DIRECT_URL");
console.log(JSON.stringify({
  RC_DATABASE_ISOLATION: "PASS",
  label: RC_TARGET,
  neonProjectId: RC_NEON_PROJECT_ID,
  databaseHost: database.host,
  directHost: direct.host,
  databaseName: database.database,
}));

const stripped = { ...process.env };
for (const name of [
  "DATABASE_URL",
  "DIRECT_URL",
  "MOC_DB_TARGET",
  "MOC_MATERIALIZER_SECRET",
  "MOC_TESTNET_CAPABILITY_SECRET",
  "MOC_TESTNET_AUTHORITY_SECRET",
  "BASE_EXECUTOR_PRIVATE_KEY",
  "MOC_TRUST_EXECUTION",
  "PRIVY_APP_SECRET",
]) {
  delete stripped[name];
}
const childEnv = {
  ...stripped,
  DATABASE_URL: file.DATABASE_URL,
  DIRECT_URL: file.DATABASE_URL_UNPOOLED,
  MOC_DB_TARGET: RC_TARGET,
  MOC_SETTLEMENT_ADAPTER: "mock",
};

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: childEnv });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "migrate", "deploy"]);
run("node", ["node_modules/vite-node/vite-node.mjs", "--config", "scripts/hackathon-rc/vite.rc.config.ts", "scripts/hackathon-rc/seed-certified-proof.ts"]);
run("node", ["node_modules/vite-node/vite-node.mjs", "--config", "scripts/hackathon-rc/vite.rc.config.ts", "scripts/hackathon-rc/seed-certified-proof.ts"]);
