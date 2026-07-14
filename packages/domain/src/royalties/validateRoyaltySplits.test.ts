import { describe, expect, it } from "vitest";
import { validateRoyaltySplits } from "./validateRoyaltySplits";

describe("validateRoyaltySplits", () => {
  it("accepts a single 100% split", () => {
    expect(validateRoyaltySplits([{ role: "Artist", percentage: 100 }])).toEqual({
      valid: true,
    });
  });

  it("accepts splits that sum to 100", () => {
    expect(
      validateRoyaltySplits([
        { role: "Artist", percentage: 60 },
        { role: "Producer", percentage: 40 },
      ])
    ).toEqual({ valid: true });
  });

  it("accepts sum within 0.01 tolerance", () => {
    expect(
      validateRoyaltySplits([
        { role: "A", percentage: 50 },
        { role: "B", percentage: 50.005 },
      ])
    ).toEqual({ valid: true });
  });

  it("rejects sum not equal to 100", () => {
    expect(
      validateRoyaltySplits([
        { role: "Artist", percentage: 50 },
        { role: "Producer", percentage: 40 },
      ])
    ).toEqual({
      valid: false,
      error: "Royalty splits must sum to 100%",
    });
  });

  it("rejects empty splits (sum 0)", () => {
    expect(validateRoyaltySplits([])).toEqual({
      valid: false,
      error: "Royalty splits must sum to 100%",
    });
  });

  it("rejects percentage below 0 when sum is 100", () => {
    expect(
      validateRoyaltySplits([
        { role: "A", percentage: 150 },
        { role: "B", percentage: -50 },
      ])
    ).toEqual({
      valid: false,
      error: "Each percentage must be between 0 and 100",
    });
  });

  it("rejects percentage above 100 when sum is 100", () => {
    expect(
      validateRoyaltySplits([
        { role: "A", percentage: 120 },
        { role: "B", percentage: -20 },
      ])
    ).toEqual({
      valid: false,
      error: "Each percentage must be between 0 and 100",
    });
  });

  it("reports sum error first for single out-of-range split (legacy parity)", () => {
    expect(
      validateRoyaltySplits([{ role: "Artist", percentage: -1 }])
    ).toEqual({
      valid: false,
      error: "Royalty splits must sum to 100%",
    });
  });
});