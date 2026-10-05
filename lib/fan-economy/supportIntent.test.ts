import { describe, expect, it } from "vitest";
import {
  beginSupportIntent,
  resolveSupportLoadPhase,
  supportLoadFailureVisible,
  supportSubmitAllowed,
} from "./supportIntent";

describe("support intent", () => {
  it("disables submit while the request is pending", () => {
    expect(
      supportSubmitAllowed({
        pending: true,
        releaseId: "release-1",
        remainingUnits: 5_000_000n,
        amountUnits: 5_000_000n,
      })
    ).toBe(false);
  });

  it("reuses the redemption id for a retry of the same intent", () => {
    let n = 0;
    const mint = () => `redeem-${++n}`;
    const first = beginSupportIntent(null, { releaseId: "release-1", units: "5000000" }, mint);
    const retry = beginSupportIntent(first, { releaseId: "release-1", units: "5000000" }, mint);
    expect(retry.id).toBe(first.id);
    expect(n).toBe(1);
  });

  it("mints a new id when the fan later chooses another amount", () => {
    let n = 0;
    const mint = () => `redeem-${++n}`;
    const first = beginSupportIntent(null, { releaseId: "release-1", units: "5000000" }, mint);
    const next = beginSupportIntent(first, { releaseId: "release-1", units: "2000000" }, mint);
    expect(next.id).not.toBe(first.id);
    expect(next.units).toBe("2000000");
  });

  it("allows another support after the previous intent is cleared and balance remains", () => {
    let n = 0;
    const mint = () => `redeem-${++n}`;
    const first = beginSupportIntent(null, { releaseId: "release-1", units: "5000000" }, mint);
    const later = beginSupportIntent(null, { releaseId: "release-1", units: "5000000" }, mint);
    expect(later.id).not.toBe(first.id);
    expect(
      supportSubmitAllowed({
        pending: false,
        releaseId: "release-1",
        remainingUnits: 5_000_000n,
        amountUnits: 5_000_000n,
      })
    ).toBe(true);
  });

  it("keeps a loaded desk when an older request fails", () => {
    expect(resolveSupportLoadPhase("ready", 1, 2, "failed")).toBe("ready");
    expect(resolveSupportLoadPhase("ready", 2, 2, "failed")).toBe("ready");
    expect(resolveSupportLoadPhase("loading", 1, 1, "failed")).toBe("error");
    expect(supportLoadFailureVisible("error", true, false)).toBe(false);
    expect(supportLoadFailureVisible("error", false, false)).toBe(true);
    expect(supportLoadFailureVisible("ready", true, true)).toBe(true);
  });
});
