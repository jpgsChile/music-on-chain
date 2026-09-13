import { afterEach, describe, expect, it } from "vitest";
import { getPrivyVerifier, setPrivyVerifierForTests } from "./privyVerifierRuntime";
import { createMockPrivyVerifier } from "./mockPrivyVerifier";

describe("Privy verifier runtime", () => {
  afterEach(() => {
    setPrivyVerifierForTests(null);
    delete process.env.PRIVY_APP_ID;
    delete process.env.PRIVY_APP_SECRET;
  });

  it("production path is privy-node when credentials exist", () => {
    process.env.PRIVY_APP_ID = "app-test";
    process.env.PRIVY_APP_SECRET = "test-secret";
    const verifier = getPrivyVerifier();
    expect(verifier.kind).toBe("privy-node");
  });

  it("tests may inject mock; that is not production verification", () => {
    setPrivyVerifierForTests(createMockPrivyVerifier());
    expect(getPrivyVerifier().kind).toBe("mock");
  });
});
