import { createPublicClient, defineChain, formatEther, getAddress, http, type Address } from "viem";
import { mockUsdcAbi, mocSettlementAbi } from "./abi";
import { createBaseSettlementAdapterWithSigner } from "./env";
import { intentRefToBytes32 } from "./intentRef";
import {
  loadSepoliaEnvFiles,
  pickExecutorPrivateKey,
  readSepoliaLiveCredentials,
  toSepoliaRuntimeEnv,
} from "./sepoliaEnv";
import { BASE_MAINNET_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, assertBaseSepoliaChainId } from "./sepoliaGuard";
import { getWalletAddressForActor } from "@/lib/domain/actorWallet";
import { executeSettlementIntent, openSettlementIntent } from "@/lib/domain/economics/execution/orchestrator";
import { getEconomicsStore, getExecutionStore } from "@/lib/domain/economics/runtime";
import { getPrisma } from "@/lib/db";

const VENGEANCE_RELEASE_ID = "cmu07o2rp0009zolvllmn57at";
const PABLO_ACTOR = "moc:actor:d219d488-f1ff-413b-abd9-3b3e23503358";
const CARLOS_ACTOR = "moc:actor:9d838ad4-4242-4074-9f29-97cf454fe76e";
const CLEAVER_ACTOR = "moc:actor:73c5f445-45d4-472e-a017-5b7e224d9d5e";
const PABLO_UNITS = 190000n;
const CARLOS_UNITS = 760000n;

function sepoliaChain(rpcUrl: string) {
  return defineChain({
    id: BASE_SEPOLIA_CHAIN_ID,
    name: "base-sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

async function tokenBalance(rpcUrl: string, token: Address, holder: Address): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: sepoliaChain(rpcUrl),
    transport: http(rpcUrl),
  });
  return publicClient.readContract({
    address: token,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: [holder],
  });
}

async function preflight(input: {
  rpcUrl: string;
  asset: Address;
  settlement: Address;
  executor: Address;
  wallet: Address;
  amount: bigint;
}) {
  const publicClient = createPublicClient({
    chain: sepoliaChain(input.rpcUrl),
    transport: http(input.rpcUrl),
  });
  const chainId = await publicClient.getChainId();
  if (chainId === BASE_MAINNET_CHAIN_ID) throw new Error("MAINNET_FORBIDDEN");
  assertBaseSepoliaChainId(chainId);
  const [version, executor, asset, eth, allowance, tokenBal] = await Promise.all([
    publicClient.readContract({
      address: input.settlement,
      abi: mocSettlementAbi,
      functionName: "VERSION",
    }),
    publicClient.readContract({
      address: input.settlement,
      abi: mocSettlementAbi,
      functionName: "executor",
    }),
    publicClient.readContract({
      address: input.settlement,
      abi: mocSettlementAbi,
      functionName: "asset",
    }),
    publicClient.getBalance({ address: input.executor }),
    publicClient.readContract({
      address: input.asset,
      abi: mockUsdcAbi,
      functionName: "allowance",
      args: [input.executor, input.settlement],
    }),
    publicClient.readContract({
      address: input.asset,
      abi: mockUsdcAbi,
      functionName: "balanceOf",
      args: [input.executor],
    }),
  ]);
  if (version !== "MOC-SETTLEMENT-V1") throw new Error("WRONG_CONTRACT");
  if (executor.toLowerCase() !== input.executor.toLowerCase()) throw new Error("SIGNER_ERROR");
  if (asset.toLowerCase() !== input.asset.toLowerCase()) throw new Error("WRONG_ASSET");
  if (allowance < input.amount) throw new Error("INSUFFICIENT_ALLOWANCE");
  if (tokenBal < input.amount) throw new Error("INSUFFICIENT_BALANCE");
  if (eth === 0n) throw new Error("GAS_ERROR");
  return { chainId, eth: formatEther(eth), allowance: allowance.toString(), executorToken: tokenBal.toString() };
}

async function pickAccrued(actorRef: string, units: bigint) {
  const row = await getPrisma().economicEntitlement.findFirst({
    where: {
      actorRef,
      status: "accrued",
      units: units.toString(),
      revenue: { releaseId: VENGEANCE_RELEASE_ID },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!row) throw new Error("ENTITLEMENT_NOT_FOUND");
  return row;
}

async function settleExisting(input: {
  actorRef: string;
  units: bigint;
  label: string;
}) {
  loadSepoliaEnvFiles();
  process.env.MOC_SETTLEMENT_ADAPTER = "base";
  const creds = readSepoliaLiveCredentials();
  if (creds.chainId === BASE_MAINNET_CHAIN_ID) throw new Error("MAINNET_FORBIDDEN");
  assertBaseSepoliaChainId(creds.chainId);
  const key = pickExecutorPrivateKey();
  if (!key) throw new Error("SIGNER_ERROR");
  if (!creds.contractAddress || !creds.assetAddress) throw new Error("CONFIGURATION_ERROR");

  const entitlement = await pickAccrued(input.actorRef, input.units);
  if (entitlement.actorRef !== input.actorRef) throw new Error("NOT_BENEFICIARY");
  if (entitlement.status !== "accrued") throw new Error("ENTITLEMENT_NOT_ACCRUED");
  if (entitlement.units !== input.units.toString() || entitlement.scale !== 6 || entitlement.asset !== "USDC") {
    throw new Error("WRONG_AMOUNT");
  }

  const walletRaw = await getWalletAddressForActor(input.actorRef);
  if (!walletRaw) throw new Error("MISSING_DESTINATION");
  const wallet = getAddress(walletRaw);

  const pre = await preflight({
    rpcUrl: creds.rpcUrl,
    asset: creds.assetAddress,
    settlement: creds.contractAddress,
    executor: creds.executorAddress,
    wallet,
    amount: input.units,
  });

  const adapter = createBaseSettlementAdapterWithSigner({
    env: toSepoliaRuntimeEnv(creds, {
      contractAddress: creds.contractAddress,
      assetAddress: creds.assetAddress,
    }),
    executorKey: key,
  });

  const economics = getEconomicsStore();
  const execution = getExecutionStore();
  const before = await tokenBalance(creds.rpcUrl, creds.assetAddress, wallet);

  const isolationCarlos = openSettlementIntent(economics, execution, {
    entitlementId: entitlement.id,
    actorRef: input.actorRef === PABLO_ACTOR ? CARLOS_ACTOR : PABLO_ACTOR,
  });
  await isolationCarlos.then(
    () => {
      throw new Error("ISOLATION_FAILED");
    },
    (error) => {
      if (!(error instanceof Error) || error.message !== "NOT_BENEFICIARY") throw error;
    }
  );
  await openSettlementIntent(economics, execution, {
    entitlementId: entitlement.id,
    actorRef: CLEAVER_ACTOR,
  }).then(
    () => {
      throw new Error("ISOLATION_FAILED");
    },
    (error) => {
      if (!(error instanceof Error) || error.message !== "NOT_BENEFICIARY") throw error;
    }
  );

  const intent = await openSettlementIntent(economics, execution, {
    entitlementId: entitlement.id,
    actorRef: input.actorRef,
    occurredAt: new Date().toISOString(),
  });
  const first = await executeSettlementIntent({
    economics,
    execution,
    adapter,
    intentRef: intent.intentRef,
    actorRef: input.actorRef,
    destinationCapability: wallet,
    executionMode: "on-chain",
    occurredAt: new Date().toISOString(),
  });
  if (first.receipt.status !== "CONFIRMED") {
    throw new Error(`SETTLEMENT_NOT_CONFIRMED:${first.receipt.status}`);
  }

  const replay = await executeSettlementIntent({
    economics,
    execution,
    adapter,
    intentRef: intent.intentRef,
    actorRef: input.actorRef,
    destinationCapability: wallet,
    executionMode: "on-chain",
    occurredAt: new Date().toISOString(),
  });
  if (replay.receipt.externalRef !== first.receipt.externalRef) {
    throw new Error("REPLAY_NEW_TX");
  }

  const publicClient = createPublicClient({
    chain: sepoliaChain(creds.rpcUrl),
    transport: http(creds.rpcUrl),
  });
  let onchainExecuted = false;
  for (let i = 0; i < 20; i += 1) {
    onchainExecuted = await publicClient.readContract({
      address: creds.contractAddress,
      abi: mocSettlementAbi,
      functionName: "executed",
      args: [intentRefToBytes32(intent.intentRef)],
    });
    if (onchainExecuted) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!onchainExecuted) throw new Error("ONCHAIN_NOT_EXECUTED");

  const after = await tokenBalance(creds.rpcUrl, creds.assetAddress, wallet);
  if (after - before !== input.units) throw new Error("BALANCE_MISMATCH");

  const persisted = await economics.getEntitlement(entitlement.id);
  if (persisted?.status !== "settled") throw new Error("ENTITLEMENT_NOT_SETTLED");

  return {
    label: input.label,
    preflight: pre,
    actorRef: input.actorRef,
    wallet,
    entitlementId: entitlement.id,
    amount: input.units.toString(),
    intentRef: intent.intentRef,
    requestRef: first.request.requestRef,
    txHash: first.receipt.externalRef,
    receiptStatus: first.receipt.status,
    receipt: first.receipt,
    replayStatus: replay.receipt.status,
    replayTx: replay.receipt.externalRef,
    balanceBefore: before.toString(),
    balanceAfter: after.toString(),
    metadata: first.receipt.metadata,
  };
}

async function main() {
  const who = (process.argv[2] ?? "pablo").trim().toLowerCase();
  if (who === "pablo") {
    const result = await settleExisting({ actorRef: PABLO_ACTOR, units: PABLO_UNITS, label: "pablo" });
    console.info(JSON.stringify(result, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2));
    return;
  }
  if (who === "carlos") {
    const result = await settleExisting({ actorRef: CARLOS_ACTOR, units: CARLOS_UNITS, label: "carlos" });
    console.info(JSON.stringify(result, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2));
    return;
  }
  throw new Error("UNKNOWN_ACTOR");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
});
