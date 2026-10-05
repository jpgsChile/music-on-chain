import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function source(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}

function functionBody(file: string, name: string): string {
  const text = source(file);
  const start = text.indexOf(`export async function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start);
  const next = rest.indexOf("\nexport async function ", name.length);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("canonical economy has no chain IO dependency", () => {
  it("keeps service.ts away from Stellar adapters", () => {
    const text = source("lib/fan-economy/service.ts");
    for (const forbidden of [
      "trust/sorobanClient",
      "trust/rpc",
      "events/source",
      "materialization/publish",
      "@stellar/stellar-sdk",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("keeps redeemReward a pure economic command", () => {
    const body = functionBody("lib/fan-economy/service.ts", "redeemReward");
    expect(body).not.toMatch(/\btrust\b/);
    expect(body).not.toContain("publishIfConfigured");
    expect(body).not.toContain("redeemWithTrust");
    expect(body).not.toContain("MOC_TRUST_EXECUTION");
    expect(body).toContain("$transaction");
  });

  it("publishes only after redeemReward returns", () => {
    const body = functionBody("lib/fan-economy/redeemApplication.ts", "completeRedeemReward");
    const redeemAt = body.indexOf("await redeemReward");
    const publishAt = body.indexOf("await publish");
    expect(redeemAt).toBeGreaterThanOrEqual(0);
    expect(publishAt).toBeGreaterThan(redeemAt);
    expect(body).toContain("catch");
  });

  it("lets the redeem command name a redemption and nothing on chain", () => {
    const route = source("app/api/fan-economy/route.ts");
    const start = route.indexOf('case "redeemReward"');
    const end = route.indexOf("case ", start + 10);
    const branch = route.slice(start, end);
    expect(branch).toContain("completeRedeemReward");
    expect(branch).not.toContain("configuredTrust");
    for (const field of [
      "network",
      "contractId",
      "materializationHash",
      "revenueHash",
      "distributionHash",
      "signer",
      "secret",
      "capability",
      "materializer",
    ]) {
      expect(branch).not.toContain(field);
    }
  });
});
