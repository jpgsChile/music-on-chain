/**
 * Sets the minimum Hackathon RC variables on moc-hackathon-rc.
 * Reads public coordinates and the unpooled URL from local gitignored files.
 * Never prints values.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { assertHackathonRcTarget, RC_NEON_PROJECT_ID } from "./target-guard.mjs";

const PROJECT = "moc-hackathon-rc";
const PROJECT_ID = "prj_fHwm64WJG9sy2LCcCmXozLZAS4Gb";
const CONTRACT = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const MATERIALIZER = "GASACPYNRZL2TRKPLXKVS3PJX7TVRTOCEWTULPRKBAX2YXJYQZU3PEA7";
const RPC = "https://soroban-testnet.stellar.org";

function parseEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

const linked = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
if (linked.projectId !== PROJECT_ID || linked.projectName !== PROJECT) {
  console.error("VERCEL_PROJECT_MISMATCH");
  process.exit(1);
}

const rc = parseEnvFile(".env.hackathon-rc.local");
if (rc.NEON_PROJECT_ID !== RC_NEON_PROJECT_ID) {
  console.error("NEON_PROJECT_MISMATCH");
  process.exit(1);
}
assertHackathonRcTarget(rc.DATABASE_URL_UNPOOLED, "DIRECT_URL");

const preprod = parseEnvFile(".env.preproduction.local");
const local = parseEnvFile(".env.local");
const privyAppId = (preprod.NEXT_PUBLIC_PRIVY_APP_ID || local.NEXT_PUBLIC_PRIVY_APP_ID || "").trim();
if (privyAppId.length < 20 || /placeholder|changeme|xxx/i.test(privyAppId)) {
  console.error("PRIVY_APP_ID_UNUSABLE");
  process.exit(1);
}
if (preprod.STELLAR_NETWORK !== "testnet") {
  console.error("STELLAR_NETWORK_REFUSED");
  process.exit(1);
}
if (preprod.STELLAR_RPC_URL !== RPC || /mainnet|pubnet/i.test(preprod.STELLAR_RPC_URL)) {
  console.error("STELLAR_RPC_REFUSED");
  process.exit(1);
}
if (preprod.MOC_FAN_ECONOMY_CONTRACT_ID !== CONTRACT) {
  console.error("CONTRACT_MISMATCH");
  process.exit(1);
}
if (preprod.MOC_MATERIALIZER_PUBLIC_KEY !== MATERIALIZER) {
  console.error("MATERIALIZER_PUBLIC_KEY_MISMATCH");
  process.exit(1);
}

const assignments = [
  ["DIRECT_URL", rc.DATABASE_URL_UNPOOLED, ["--sensitive"]],
  ["NEXT_PUBLIC_PRIVY_APP_ID", privyAppId, ["--no-sensitive"]],
  ["STELLAR_NETWORK", "testnet", ["--no-sensitive"]],
  ["STELLAR_RPC_URL", RPC, ["--no-sensitive"]],
  ["MOC_FAN_ECONOMY_CONTRACT_ID", CONTRACT, ["--no-sensitive"]],
  ["MOC_MATERIALIZER_PUBLIC_KEY", MATERIALIZER, ["--no-sensitive"]],
  ["MOC_SETTLEMENT_ADAPTER", "mock", ["--no-sensitive"]],
];

function add(name, value, flags) {
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "production", "--scope", "jpgschiles-projects", "--project", PROJECT, "--yes", ...flags],
    { input: value, encoding: "utf8" }
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-url]");
  if (result.status !== 0) {
    console.error(`${name} FAILED`);
    console.error(output.replace(value, "[redacted]").slice(0, 500));
    process.exit(result.status ?? 1);
  }
  console.log(`${name} SET`);
}

for (const [name, value, flags] of assignments) add(name, value, flags);
console.log(JSON.stringify({
  project: PROJECT,
  configured: assignments.map(([name]) => name),
  absent: ["MOC_TRUST_EXECUTION", "MOC_MATERIALIZER_SECRET", "MOC_TESTNET_CAPABILITY_SECRET", "MOC_TESTNET_AUTHORITY_SECRET", "BASE_EXECUTOR_PRIVATE_KEY", "PRIVY_APP_SECRET", "NEXT_PUBLIC_BASE_CHAIN"],
}));
