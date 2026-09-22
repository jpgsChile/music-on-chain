import { describe, expect, it } from "vitest";
import { isOnChainReceipt, isSimulatedMockReceipt } from "./semantics";

describe("settlement receipt semantics", () => {
  it("treats mock CONFIRMED as simulated off-chain, not on-chain", () => {
    const receipt = {
      executionMode: "off-chain" as const,
      status: "CONFIRMED",
      externalRef: "mock:req:1",
      metadata: { adapter: "mock", simulated: true, onChain: false },
    };
    expect(isSimulatedMockReceipt(receipt)).toBe(true);
    expect(isOnChainReceipt(receipt)).toBe(false);
  });

  it("treats Base Sepolia CONFIRMED as on-chain", () => {
    const receipt = {
      executionMode: "on-chain" as const,
      status: "CONFIRMED",
      externalRef: "0xabc",
      metadata: { adapter: "base", simulated: false, onChain: true, chainId: 84532 },
    };
    expect(isSimulatedMockReceipt(receipt)).toBe(false);
    expect(isOnChainReceipt(receipt)).toBe(true);
  });

  it("does not infer on-chain from CONFIRMED alone", () => {
    const receipt = {
      executionMode: "off-chain" as const,
      status: "CONFIRMED",
      externalRef: "rcpt:1",
    };
    expect(isOnChainReceipt(receipt)).toBe(false);
    expect(isSimulatedMockReceipt(receipt)).toBe(false);
  });
});
