/**
 * Refuses every database target except the isolated Hackathon RC Neon database.
 * Prints host and database name only. Never prints credentials.
 */

export const RC_TARGET = "hackathon_rc";

/** Endpoint created for moc-hackathon-rc. Not production and not preproduction. */
export const RC_HOST_MARKER = "ep-late-forest-b79gbkif";
export const RC_DATABASE_NAME = "neondb";
export const RC_NEON_PROJECT_ID = "crimson-tree-82881336";

const FORBIDDEN = [
  "hcfknaiwjkwjjdwfjmjq",
  "cqxnnmwwxpxjmnkpdbjm",
  "supabase",
  "pooler.supabase",
  "aws-0-ca-central-1",
];

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodedIdentity(parsed) {
  const params = [];
  for (const [key, value] of parsed.searchParams) params.push(`${safeDecode(key)}=${safeDecode(value)}`);
  return [parsed.hostname, safeDecode(parsed.username), safeDecode(parsed.pathname), params.join("&")].join("\n").toLowerCase();
}

export function assertHackathonRcTarget(url, label) {
  if (!url || typeof url !== "string") {
    throw new Error(`${label}_MISSING`);
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label}_UNPARSEABLE`);
  }
  const identity = `${url}\n${decodedIdentity(parsed)}`.toLowerCase();
  for (const marker of FORBIDDEN) {
    if (identity.includes(marker)) throw new Error(`${label}_FORBIDDEN_TARGET`);
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(`${label}_NOT_POSTGRES`);
  }
  if (!parsed.hostname.endsWith(".neon.tech")) throw new Error(`${label}_NOT_NEON`);
  if (!parsed.hostname.includes(RC_HOST_MARKER)) throw new Error(`${label}_HOST_MISMATCH`);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (database !== RC_DATABASE_NAME) throw new Error(`${label}_DATABASE_MISMATCH`);
  return { host: parsed.hostname, database };
}

export function assertOperatorLabel(value) {
  if (value !== RC_TARGET) throw new Error("MOC_DB_TARGET_REFUSED");
}
