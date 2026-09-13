import type { Address } from "viem";
import { MOC_PRODUCT_FEE_POLICY_V1 } from "../../policy";
import { money } from "../../money";
import { createMemoryEconomicsStore, recordRevenueOnce } from "../../store";
import { createMemoryExecutionStore } from "../store";
import { executeSettlementIntent, openSettlementIntent } from "../orchestrator";
import { createBaseSettlementAdapter } from "./adapter";
import { createBaseSettlementAdapterWithSigner } from "./env";
import { intentRefToBytes32 } from "./intentRef";
import { toSepoliaRuntimeEnv, type SepoliaLiveCredentials } from "./sepoliaEnv";
import { assertBaseSepoliaChainId } from "./sepoliaGuard";
import { createSepoliaClients, type SepoliaDeployment } from "./sepoliaDeploy";
import { createViemBaseChainPort } from "./viemPort";
import { mocSettlementAbi, mockUsdcAbi } from "./abi";

export const SEPOLIA_PROOF_AMOUNT = 1_000n; // 0.001 of a 6-decimal test asset
export const SEPOLIA_TEST_BENEFICIARY =
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address;
export const SEPOLIA_TEST_ACTOR = "moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

export type SepoliaExecutionEvidence = {
  intentRef: string;
  requestRef: string;
  beneficiary: Address;
  amount: string;
  asset: string;
  transactionHash?: string;
  blockNumber?: string;
  logIndex?: number;
  chainId: number;
  contractAddress: Address;
  assetAddress: Address;
  executorAddress: Address;
  status: string;
};

export function createSepoliaAdapter(
  creds: SepoliaLiveCredentials,
  deployment: SepoliaDeployment,
  options?: { waitForConfirmation?: boolean }
) {
  assertBaseSepoliaChainId(creds.chainId);
  const env = toSepoliaRuntimeEnv(creds, {
    contractAddress: deployment.settlement.address,
    assetAddress: deployment.asset.address,
  });
  const adapter = createBaseSettlementAdapterWithSigner({
    env,
    executorKey: creds.executorKey,
  });
  if (options?.waitForConfirmation === false) {
    const { account, publicClient, walletClient } = createSepoliaClients(creds.rpcUrl, creds.executorKey);
    return createBaseSettlementAdapter({
      config: {
        chainId: env.chainId,
        contractAddress: env.contractAddress,
        usdcAddress: env.usdcAddress,
        executorAddress: env.executorAddress,
        assetSymbol: env.assetSymbol,
        tokenDecimals: env.tokenDecimals,
        contractVersion: env.contractVersion,
        waitForConfirmation: false,
        receiptTimeoutMs: 20_000,
      },
      chain: createViemBaseChainPort({
        publicClient,
        walletClient,
        contractAddress: env.contractAddress,
        usdcAddress: env.usdcAddress,
        account,
      }),
    });
  }
  return adapter;
}

export async function runDomainSettlementOnSepolia(input: {
  creds: SepoliaLiveCredentials;
  deployment: SepoliaDeployment;
  intentRef: string;
  requestRef: string;
  beneficiary?: Address;
  amount?: bigint;
  waitForConfirmation?: boolean;
}) {
  const amount = input.amount ?? SEPOLIA_PROOF_AMOUNT;
  const beneficiary = input.beneficiary ?? SEPOLIA_TEST_BENEFICIARY;
  const economics = createMemoryEconomicsStore();
  const execution = createMemoryExecutionStore();
  await recordRevenueOnce(economics, {
    revenueId: `rev:${input.intentRef}`,
    distributionId: `dist:${input.intentRef}`,
    gross: money(amount, input.creds.assetSymbol, input.creds.tokenDecimals),
    policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
    rule: {
      ruleId: "solo",
      shares: [{ actorRef: SEPOLIA_TEST_ACTOR, bps: 10_000, source: { kind: "rule" } }],
    },
    occurredAt: new Date().toISOString(),
  });
  const entitlement = (await economics.listEntitlements(SEPOLIA_TEST_ACTOR))[0];
  const intent = await openSettlementIntent(economics, execution, {
    entitlementId: entitlement.entitlementId,
    actorRef: SEPOLIA_TEST_ACTOR,
    intentRef: input.intentRef,
    occurredAt: new Date().toISOString(),
  });
  const adapter = createSepoliaAdapter(input.creds, input.deployment, {
    waitForConfirmation: input.waitForConfirmation,
  });
  const result = await executeSettlementIntent({
    economics,
    execution,
    adapter,
    intentRef: intent.intentRef,
    actorRef: SEPOLIA_TEST_ACTOR,
    destinationCapability: beneficiary,
    executionMode: "on-chain",
    requestRef: input.requestRef,
    occurredAt: new Date().toISOString(),
  });
  return { economics, execution, entitlement, intent, result, adapter, beneficiary, amount };
}

export async function readBeneficiaryBalance(
  creds: SepoliaLiveCredentials,
  asset: Address,
  beneficiary: Address
): Promise<bigint> {
  const { publicClient } = createSepoliaClients(creds.rpcUrl, creds.executorKey);
  return publicClient.readContract({
    address: asset,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: [beneficiary],
  });
}

export async function readOnchainExecuted(
  creds: SepoliaLiveCredentials,
  contract: Address,
  intentRef: string
): Promise<boolean> {
  const { publicClient } = createSepoliaClients(creds.rpcUrl, creds.executorKey);
  return publicClient.readContract({
    address: contract,
    abi: mocSettlementAbi,
    functionName: "executed",
    args: [intentRefToBytes32(intentRef)],
  });
}

export function toEvidence(input: {
  intentRef: string;
  requestRef: string;
  beneficiary: Address;
  amount: bigint;
  deployment: SepoliaDeployment;
  status: string;
  transactionHash?: string;
  blockNumber?: string;
  logIndex?: number;
}): SepoliaExecutionEvidence {
  return {
    intentRef: input.intentRef,
    requestRef: input.requestRef,
    beneficiary: input.beneficiary,
    amount: input.amount.toString(),
    asset: input.deployment.asset.address,
    transactionHash: input.transactionHash,
    blockNumber: input.blockNumber,
    logIndex: input.logIndex,
    chainId: input.deployment.chainId,
    contractAddress: input.deployment.settlement.address,
    assetAddress: input.deployment.asset.address,
    executorAddress: input.deployment.executorAddress,
    status: input.status,
  };
}
