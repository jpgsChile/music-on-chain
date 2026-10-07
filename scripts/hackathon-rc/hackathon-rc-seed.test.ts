import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";
import { copyCertifiedHackathonProof } from "./seed-certified-proof";
import { assertHackathonRcTarget, assertOperatorLabel, RC_HOST_MARKER, RC_DATABASE_NAME } from "./target-guard.mjs";

const PASSWORD = "local-test-secret";
const DIRECT = `postgresql://rc_user:${encodeURIComponent("p@ss")}@${RC_HOST_MARKER}.c-13.us-east-1.aws.neon.tech/${RC_DATABASE_NAME}?sslmode=require`;
const POOLER = `postgresql://rc_user:${encodeURIComponent("p@ss")}@${RC_HOST_MARKER}-pooler.c-13.us-east-1.aws.neon.tech/${RC_DATABASE_NAME}?sslmode=require`;

describe("hackathon rc seed guard", () => {
  it("rejects a missing or wrong operator label", () => {
    expect(() => assertOperatorLabel(undefined)).toThrow("MOC_DB_TARGET_REFUSED");
    expect(() => assertOperatorLabel("")).toThrow("MOC_DB_TARGET_REFUSED");
    expect(() => assertOperatorLabel("production")).toThrow("MOC_DB_TARGET_REFUSED");
    expect(() => assertOperatorLabel("preproduction")).toThrow("MOC_DB_TARGET_REFUSED");
    expect(() => assertOperatorLabel("hackathon_rc")).not.toThrow();
  });

  it("rejects production, preproduction, and unknown targets without connecting", () => {
    expect(() => assertHackathonRcTarget("", "DATABASE_URL")).toThrow("DATABASE_URL_MISSING");
    expect(() =>
      assertHackathonRcTarget(
        `postgresql://postgres.hcfknaiwjkwjjdwfjmjq:${PASSWORD}@aws-0-ca-central-1.pooler.supabase.com:6543/postgres`,
        "DATABASE_URL"
      )
    ).toThrow("DATABASE_URL_FORBIDDEN_TARGET");
    expect(() =>
      assertHackathonRcTarget(
        `postgresql://postgres.cqxnnmwwxpxjmnkpdbjm:${PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
        "DIRECT_URL"
      )
    ).toThrow("DIRECT_URL_FORBIDDEN_TARGET");
    expect(() =>
      assertHackathonRcTarget(
        `postgresql://%68cfknaiwjkwjjdwfjmjq:${PASSWORD}@${RC_HOST_MARKER}.c-13.us-east-1.aws.neon.tech/${RC_DATABASE_NAME}`,
        "DATABASE_URL"
      )
    ).toThrow("DATABASE_URL_FORBIDDEN_TARGET");
    expect(() =>
      assertHackathonRcTarget(
        `postgresql://rc_user:${PASSWORD}@ep-other-database.c-13.us-east-1.aws.neon.tech/${RC_DATABASE_NAME}`,
        "DATABASE_URL"
      )
    ).toThrow("DATABASE_URL_HOST_MISMATCH");
  });

  it("accepts the certified endpoint in direct and pooler form without exposing the secret", () => {
    for (const url of [DIRECT, POOLER]) {
      const target = assertHackathonRcTarget(url, "DATABASE_URL");
      const printed = JSON.stringify(target);
      expect(target.database).toBe(RC_DATABASE_NAME);
      expect(target.host).toContain(RC_HOST_MARKER);
      expect(printed).not.toContain("p@ss");
      expect(printed).not.toContain(PASSWORD);
      expect(printed).not.toContain("rc_user");
      expect(printed).not.toContain("postgresql://");
    }
  });

  it("keeps the certified copy idempotent inside an isolated database", async () => {
    const opened = await openIsolatedPrisma();
    try {
      expect(await copyCertifiedHackathonProof(opened.client)).toBe("inserted");
      expect(await copyCertifiedHackathonProof(opened.client)).toBe("already-present");
      const [actors, bindings, wallets, redemptions, revenues, entitlements, evidence, observations, campaigns] = await Promise.all([
        opened.client.actor.count(),
        opened.client.identityBinding.count(),
        opened.client.actorWallet.count(),
        opened.client.redemption.count(),
        opened.client.economicRevenue.count(),
        opened.client.economicEntitlement.count(),
        opened.client.economicChainEvidence.count(),
        opened.client.chainEventObservation.count(),
        opened.client.campaign.count(),
      ]);
      expect({ actors, bindings, wallets, redemptions, revenues, entitlements, evidence, observations, campaigns }).toEqual({
        actors: 1,
        bindings: 0,
        wallets: 0,
        redemptions: 1,
        revenues: 1,
        entitlements: 1,
        evidence: 1,
        observations: 0,
        campaigns: 1,
      });
      const redemption = await opened.client.redemption.findUniqueOrThrow({ where: { id: "redeem-b3e4df75-2f1" } });
      const row = await opened.client.economicChainEvidence.findFirstOrThrow({ where: { redemptionId: redemption.id } });
      expect(redemption.revenueId).toBe("revenue:redemption:redeem-b3e4df75-2f1");
      expect(redemption.units).toBe("1000000");
      expect(row.contractId).toBe("CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI");
      expect(row.transactionHash).toBe("fcb8bb94eec5be7e853c2db3d59a83dbca6a5c7e3c22079e2f33dba6fc3c2119");
      expect(row.ledger).toBe(5041383);
      expect(row.materializationHash).toBe("a5c9d5a53c8f5e804d3a2e310438073e23a337ab77d557b498799b30506d50d9");
      expect(row.state).toBe("confirmed");
      expect(row.network).toBe("testnet");
    } finally {
      await closeIsolatedPrisma(opened.client, opened.file);
    }
  });

  it("does not log connection strings or call a chain", () => {
    const seed = readFileSync("scripts/hackathon-rc/seed-certified-proof.ts", "utf8");
    const guard = readFileSync("scripts/hackathon-rc/target-guard.mjs", "utf8");
    const apply = readFileSync("scripts/hackathon-rc/apply-rc.mjs", "utf8");
    const surface = [seed, guard, apply].join("\n");
    expect(surface).not.toMatch(/console\.(log|error)\([^)]*DATABASE_URL/);
    expect(surface).not.toMatch(/console\.(log|error)\([^)]*DIRECT_URL/);
    expect(seed).not.toMatch(/fromSecret|lockRedemption\(|redeemWithTrust|publishIfConfigured|sendTransaction|stellar-sdk|BASE_EXECUTOR_PRIVATE_KEY\s*=/);
    expect(seed).not.toMatch(/\bTRUNCATE\b|\bDROP\b|deleteMany\(/);
    expect(seed.indexOf("MATERIALIZATION_MISMATCH")).toBeLessThan(seed.indexOf("$transaction"));
    expect(seed).not.toMatch(/identityBinding\.create|actorWallet\.create|actorSession\.create|email:/);
  });
});
