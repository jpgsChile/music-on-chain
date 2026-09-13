import type { PrivyServerVerifier } from "./privyVerifier";
import { createPrivyNodeVerifier, isPrivyVerifierConfigured } from "./privyNodeVerifier";

let testOverride: PrivyServerVerifier | null = null;

export function setPrivyVerifierForTests(verifier: PrivyServerVerifier | null) {
  testOverride = verifier;
}

export function getPrivyVerifier(): PrivyServerVerifier {
  if (testOverride) return testOverride;
  return createPrivyNodeVerifier();
}

export { isPrivyVerifierConfigured };
