import { keccak256, stringToHex, type Hex } from "viem";

/**
 * On-chain key for a domain SettlementIntent.
 * keccak256(utf8(intentRef)) — independent of tx hash, nonce, gas, RPC, and block.
 */
export function intentRefToBytes32(intentRef: string): Hex {
  const trimmed = intentRef.trim();
  if (!trimmed) {
    throw new Error("INVALID_INTENT_REF");
  }
  return keccak256(stringToHex(trimmed));
}

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
