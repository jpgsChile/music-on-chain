import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  actorHash,
  assetHash,
  assignmentHash,
  campaignHash,
  distributionHash,
  hex32,
  materializationHash,
  redemptionHash,
  releaseCommandHash,
  releaseHash,
  revenueHash,
} from "@/lib/fan-economy/trust/canonical";

const vectors = JSON.parse(
  readFileSync(path.join(process.cwd(), "contracts/soroban/fan-economy-trust/vectors.json"), "utf8")
) as {
  actor: { input: string; hash: string };
  campaign: { input: string; hash: string };
  assignment: { input: string; hash: string };
  redemption: { input: string; hash: string };
  release: { input: string; hash: string };
  asset: { input: string; hash: string };
  revenue: { input: string; hash: string };
  command: { input: string; hash: string };
  distribution: { entries: { actorRef: string; shareBps: number }[]; hash: string };
  materialization: { redemptionId: string; revenueId: string; hash: string };
};

describe("canonical hash vectors", () => {
  it("matches the Soroban vectors for the same inputs", () => {
    expect(hex32(actorHash(vectors.actor.input))).toBe(vectors.actor.hash);
    expect(hex32(campaignHash(vectors.campaign.input))).toBe(vectors.campaign.hash);
    expect(hex32(assignmentHash(vectors.assignment.input))).toBe(vectors.assignment.hash);
    expect(hex32(redemptionHash(vectors.redemption.input))).toBe(vectors.redemption.hash);
    expect(hex32(releaseHash(vectors.release.input))).toBe(vectors.release.hash);
    expect(hex32(assetHash(vectors.asset.input))).toBe(vectors.asset.hash);
    expect(hex32(revenueHash(vectors.revenue.input))).toBe(vectors.revenue.hash);
    expect(hex32(releaseCommandHash(vectors.command.input))).toBe(vectors.command.hash);
    const distribution = distributionHash(vectors.distribution.entries);
    expect(hex32(distribution)).toBe(vectors.distribution.hash);
    expect(
      hex32(
        materializationHash({
          redemptionId: vectors.materialization.redemptionId,
          revenueId: vectors.materialization.revenueId,
          distribution,
        })
      )
    ).toBe(vectors.materialization.hash);
  });
});
