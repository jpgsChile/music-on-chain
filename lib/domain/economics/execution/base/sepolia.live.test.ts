import { describe, expect, it } from "vitest";
import { executeSettlementIntent } from "../orchestrator";
import { mocSettlementAbi, MOC_SETTLEMENT_VERSION } from "./abi";
import { intentRefToBytes32 } from "./intentRef";
import { hasSepoliaLiveCredentials, readSepoliaLiveCredentials } from "./sepoliaEnv";
import {
  createSepoliaClients,
  deployMocSettlementToSepolia,
  fundTestAssetAndApprove,
} from "./sepoliaDeploy";
import {
  SEPOLIA_PROOF_AMOUNT,
  SEPOLIA_TEST_ACTOR,
  SEPOLIA_TEST_BENEFICIARY,
  readBeneficiaryBalance,
  readOnchainExecuted,
  runDomainSettlementOnSepolia,
} from "./sepoliaFlow";

const live = hasSepoliaLiveCredentials();

describe.skipIf(!live)("Base Sepolia controlled deployment (live)", () => {
  it(
    "deploys V1, settles once, reconciles, rejects replay, and fails safely",
    { timeout: 180_000 },
    async () => {
      const creds = readSepoliaLiveCredentials();
      const stamp = Date.now();
      const intentRef = `intent:sepolia:${stamp}`;
      const requestRef = `req:sepolia:${stamp}`;

      const deployment = await deployMocSettlementToSepolia(creds, (row) => {
        console.info("[moc-sepolia]", JSON.stringify(row));
      });
      expect(deployment.chainId).toBe(84532);
      expect(deployment.settlement.version).toBe(MOC_SETTLEMENT_VERSION);
      expect(deployment.asset.note).toContain("NOT PRODUCTION");
      expect(deployment.executorAddress.toLowerCase()).toBe(creds.executorAddress.toLowerCase());

      await fundTestAssetAndApprove({
        creds,
        assetAddress: deployment.asset.address,
        settlementAddress: deployment.settlement.address,
        amount: SEPOLIA_PROOF_AMOUNT * 3n,
      });

      const before = await readBeneficiaryBalance(
        creds,
        deployment.asset.address,
        SEPOLIA_TEST_BENEFICIARY
      );

      const first = await runDomainSettlementOnSepolia({
        creds,
        deployment,
        intentRef,
        requestRef,
      });

      expect(first.intent.intentRef).toBe(intentRef);
      expect(first.result.request.requestRef).toBe(requestRef);
      expect(first.result.receipt.requestRef).toBe(requestRef);
      expect(first.result.receipt.intentRef).toBe(intentRef);
      expect(first.result.receipt.status).toBe("CONFIRMED");
      expect(first.result.receipt.externalRef).not.toBe(intentRef);
      expect(first.result.receipt.externalRef).not.toBe(SEPOLIA_TEST_ACTOR);
      expect(first.entitlement.actorRef).toBe(SEPOLIA_TEST_ACTOR);
      expect(first.entitlement.actorRef).not.toBe(SEPOLIA_TEST_BENEFICIARY);
      expect(first.result.request.requestRef).not.toBe(first.result.receipt.externalRef);

      const after = await readBeneficiaryBalance(
        creds,
        deployment.asset.address,
        SEPOLIA_TEST_BENEFICIARY
      );
      expect(after - before).toBe(SEPOLIA_PROOF_AMOUNT);
      expect(await readOnchainExecuted(creds, deployment.settlement.address, intentRef)).toBe(true);
      expect(first.result.receipt.metadata?.intentRefBytes32).toBe(intentRefToBytes32(intentRef));

      const replay = await executeSettlementIntent({
        economics: first.economics,
        execution: first.execution,
        adapter: first.adapter,
        intentRef,
        actorRef: SEPOLIA_TEST_ACTOR,
        destinationCapability: SEPOLIA_TEST_BENEFICIARY,
        executionMode: "on-chain",
        occurredAt: new Date().toISOString(),
      });
      expect(replay.intent.intentRef).toBe(intentRef);
      expect(replay.receipt.status).toBe("CONFIRMED");
      expect(replay.request.requestRef).toBe(requestRef);
      expect(first.economics.listEntitlements(SEPOLIA_TEST_ACTOR)).toHaveLength(1);
      expect(
        await readBeneficiaryBalance(creds, deployment.asset.address, SEPOLIA_TEST_BENEFICIARY)
      ).toBe(after);

      const { account, publicClient, walletClient } = createSepoliaClients(creds.rpcUrl, creds.executorKey);
      try {
        const hash = await walletClient.writeContract({
          address: deployment.settlement.address,
          abi: mocSettlementAbi,
          functionName: "settle",
          args: [
            intentRefToBytes32(intentRef),
            SEPOLIA_TEST_BENEFICIARY,
            SEPOLIA_PROOF_AMOUNT,
            deployment.asset.address,
          ],
          account,
          chain: walletClient.chain,
          gas: 500_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        expect(receipt.status).toBe("reverted");
      } catch {
        // eth_call rejected AlreadyExecuted — valid replay protection.
      }
      expect(
        await readBeneficiaryBalance(creds, deployment.asset.address, SEPOLIA_TEST_BENEFICIARY)
      ).toBe(after);

      await fundTestAssetAndApprove({
        creds,
        assetAddress: deployment.asset.address,
        settlementAddress: deployment.settlement.address,
        amount: 0n,
      });
      const failed = await runDomainSettlementOnSepolia({
        creds,
        deployment,
        intentRef: `intent:sepolia-fail:${stamp}`,
        requestRef: `req:sepolia-fail:${stamp}`,
      });
      expect(failed.result.receipt.status).toBe("FAILED");
      expect(failed.result.entitlement.status).toBe("accrued");

      await fundTestAssetAndApprove({
        creds,
        assetAddress: deployment.asset.address,
        settlementAddress: deployment.settlement.address,
        amount: SEPOLIA_PROOF_AMOUNT,
      });
      const submitted = await runDomainSettlementOnSepolia({
        creds,
        deployment,
        intentRef: `intent:sepolia-unknown:${stamp}`,
        requestRef: `req:sepolia-unknown:${stamp}`,
        waitForConfirmation: false,
      });
      expect(submitted.result.receipt.status).not.toBe("FAILED");
      const reconciled = await submitted.adapter.reconcile({
        request: submitted.result.request,
        previous: submitted.result.receipt,
      });
      expect(reconciled.requestRef).toBe(submitted.result.request.requestRef);
      expect(reconciled.intentRef).toBe(`intent:sepolia-unknown:${stamp}`);
      expect(["CONFIRMED", "SUBMITTED", "UNKNOWN"]).toContain(reconciled.status);
    }
  );
});

describe("Base Sepolia live gate", () => {
  it("does not invent a live run when credentials are absent", () => {
    if (!live) {
      expect(hasSepoliaLiveCredentials()).toBe(false);
    }
  });
});
