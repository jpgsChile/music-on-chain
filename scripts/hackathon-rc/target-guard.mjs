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

export function assertHackathonRcTarget(url, label) {
  if (!url || typeof url !== "string") {
    throw new Error(`${label}_MISSING`);
  }
  const blob = url.toLowerCase();
  for (const marker of FORBIDDEN) {
    if (blob.includes(marker)) throw new Error(`${label}_FORBIDDEN_TARGET`);
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label}_UNPARSEABLE`);
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(`${label}_NOT_POSTGRES`);
  }
  if (!parsed.hostname.endsWith(".neon.tech")) throw new Error(`${label}_NOT_NEON`);
  if (!parsed.hostname.includes(RC_HOST_MARKER)) throw new Error(`${label}_HOST_MISMATCH`);
  const database = parsed.pathname.replace(/^\//, "");
  if (database !== RC_DATABASE_NAME) throw new Error(`${label}_DATABASE_MISMATCH`);
  if (parsed.username.toLowerCase().includes("hcfknaiwjkwjjdwfjmjq")) throw new Error(`${label}_FORBIDDEN_TARGET`);
  if (parsed.username.toLowerCase().includes("cqxnnmwwxpxjmnkpdbjm")) throw new Error(`${label}_FORBIDDEN_TARGET`);
  return { host: parsed.hostname, database };
}

export function assertOperatorLabel(value) {
  if (value !== RC_TARGET) throw new Error("MOC_DB_TARGET_REFUSED");
}
