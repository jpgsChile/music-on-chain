import { describe, expect, it } from "vitest";
import { purchasingPower, remainingUnits } from "@/lib/domain/fanEconomy/amounts";
import { groupSupportHistory, type SupportHistoryRedemption } from "./supportHistory";

const artist = { name: "Artista", shareBps: 10000 };

function redemption(
  redemptionId: string,
  releaseId: string,
  units: string,
  releaseTitle = "MOC Preprod Test"
): SupportHistoryRedemption {
  return {
    redemptionId,
    releaseId,
    releaseTitle,
    amount: { units, scale: 6, asset: "USDC" },
    state: "recorded",
    participants: [artist],
  };
}

describe("fan support history projection", () => {
  it("renders two $5 redemptions of the same release as independent rows totaling $10", () => {
    const rows = [
      redemption("redeem-4bee9175-233", "release-a", "5000000"),
      redemption("redeem-25c4c6f0-2b5", "release-a", "5000000"),
    ];
    const [group] = groupSupportHistory(rows);
    expect(group.rows).toHaveLength(2);
    expect(group.rows.map((row) => row.redemptionId)).toEqual(["redeem-4bee9175-233", "redeem-25c4c6f0-2b5"]);
    expect(group.rows.map((row) => row.amount.units)).toEqual(["5000000", "5000000"]);
    expect(group.total).toEqual({ units: "10000000", scale: 6, asset: "USDC" });
    expect(group).not.toHaveProperty("redemptionId");
  });

  it("keeps earlier redemptions visible when one id was just supported", () => {
    const rows = [
      redemption("redeem-earlier", "release-a", "5000000"),
      redemption("redeem-latest", "release-a", "5000000"),
    ];
    const justSupported = "redeem-latest";
    const visible = groupSupportHistory(rows).flatMap((group) => group.rows);
    const highlighted = visible.find((row) => row.redemptionId === justSupported);
    expect(visible.map((row) => row.redemptionId)).toEqual(["redeem-earlier", "redeem-latest"]);
    expect(highlighted?.redemptionId).toBe("redeem-latest");
  });

  it("groups different releases without mixing totals", () => {
    const groups = groupSupportHistory([
      redemption("redeem-a1", "release-a", "5000000", "Release A"),
      redemption("redeem-a2", "release-a", "5000000", "Release A"),
      redemption("redeem-b1", "release-b", "2000000", "Release B"),
    ]);
    expect(groups.map((group) => group.releaseId)).toEqual(["release-a", "release-b"]);
    expect(groups[0].total?.units).toBe("10000000");
    expect(groups[1].rows.map((row) => row.redemptionId)).toEqual(["redeem-b1"]);
    expect(groups[1].total).toEqual({ units: "2000000", scale: 6, asset: "USDC" });
  });

  it("keeps global purchasing power independent from a release total", () => {
    const [group] = groupSupportHistory([
      redemption("redeem-1", "release-a", "5000000"),
      redemption("redeem-2", "release-a", "5000000"),
    ]);
    const remaining = remainingUnits({
      authorizedUnits: 10_000_000n,
      consumedUnits: 10_000_000n,
      releasedUnits: 0n,
    });
    const power = purchasingPower([{ remainingUnits: remaining, asset: "USDC", scale: 6 }]);
    expect(group.total?.units).toBe("10000000");
    expect(remaining).toBe(0n);
    expect(power).toEqual([]);
  });

  it("does not invent a redemption or revenue id for the derived total", () => {
    const rows = [
      redemption("redeem-1", "release-a", "5000000"),
      redemption("redeem-2", "release-a", "5000000"),
    ];
    const [group] = groupSupportHistory(rows);
    const projectedIds = group.rows.map((row) => row.redemptionId);
    expect(projectedIds).toEqual(rows.map((row) => row.redemptionId));
    expect(JSON.stringify(group.total)).not.toContain("redeem-");
    expect(JSON.stringify(group.total)).not.toContain("revenue:");
  });
});
