import { createRequire } from "node:module";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  type Account,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mockUsdcAbi, MOC_SETTLEMENT_VERSION } from "./abi";
import { compileSettlementContracts } from "./compile";
import { createViemBaseChainPort } from "./viemPort";
import type { BaseChainPort, BaseSettlementConfig } from "./types";
import { assertBaseSepoliaChainId, assertNotMainnetChainId } from "./sepoliaGuard";

const require = createRequire(import.meta.url);

/** Well-known local test key. Never used in production. Never logged. */
export const LOCAL_EXECUTOR_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
export const LOCAL_BENEFICIARY_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;
export const LOCAL_BENEFICIARY_B_KEY =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as Hex;
export const LOCAL_ATTACKER_KEY =
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" as Hex;

/** Isolated local EVM id (Anvil/Ganache default). Never Base Mainnet. */
export const LOCAL_CHAIN_ID = 31337;

const LOCAL_NATIVE_BALANCE = "0x3635c9adc5dea00000";

export type LocalSettlementChain = {
  config: BaseSettlementConfig;
  chain: BaseChainPort;
  executor: Account;
  beneficiary: Address;
  beneficiaryB: Address;
  attacker: Address;
  executorAddress: Address;
  usdcAddress: Address;
  contractAddress: Address;
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
  transport: ReturnType<typeof custom>;
  chainDef: ReturnType<typeof defineChain>;
  mint(to: Address, amount: bigint): Promise<void>;
  approve(amount: bigint): Promise<void>;
  close(): Promise<void>;
};

/**
 * In-process EVM (Ganache) with MockUSDC + MOCSettlement V1.
 * No public RPC unless `forkUrl` is set. No Privy. No faucet. No Base Mainnet.
 */
export async function startLocalSettlementChain(options?: {
  chainId?: number;
  forkUrl?: string;
}): Promise<LocalSettlementChain> {
  const ganache = require("ganache") as {
    provider: (opts: Record<string, unknown>) => {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      disconnect?: () => Promise<void>;
    };
  };

  const requestedChainId = options?.chainId ?? LOCAL_CHAIN_ID;
  assertNotMainnetChainId(requestedChainId);

  const executor = privateKeyToAccount(LOCAL_EXECUTOR_KEY);
  const beneficiaryAccount = privateKeyToAccount(LOCAL_BENEFICIARY_KEY);
  const beneficiaryBAccount = privateKeyToAccount(LOCAL_BENEFICIARY_B_KEY);
  const attackerAccount = privateKeyToAccount(LOCAL_ATTACKER_KEY);

  const walletAccounts = [
    { secretKey: LOCAL_EXECUTOR_KEY, balance: LOCAL_NATIVE_BALANCE },
    { secretKey: LOCAL_BENEFICIARY_KEY, balance: LOCAL_NATIVE_BALANCE },
    { secretKey: LOCAL_BENEFICIARY_B_KEY, balance: LOCAL_NATIVE_BALANCE },
    { secretKey: LOCAL_ATTACKER_KEY, balance: LOCAL_NATIVE_BALANCE },
  ];

  const ganacheOpts: Record<string, unknown> = {
    miner: { blockTime: 0 },
    wallet: { accounts: walletAccounts },
    logging: { quiet: true },
  };
  if (options?.forkUrl) {
    ganacheOpts.fork = { url: options.forkUrl };
  } else {
    ganacheOpts.chain = { chainId: requestedChainId, hardfork: "berlin" };
  }

  const provider = ganache.provider(ganacheOpts);

  const hexId = (await provider.request({ method: "eth_chainId" })) as string;
  const chainId = Number.parseInt(hexId, 16);
  assertNotMainnetChainId(chainId);
  if (options?.forkUrl) {
    assertBaseSepoliaChainId(chainId);
  }

  const chain = defineChain({
    id: chainId,
    name: options?.forkUrl ? "moc-fork-base-sepolia" : "moc-local-evm",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  });

  const transport = custom({
    async request({ method, params }) {
      return provider.request({ method, params: (params as unknown[]) ?? [] });
    },
  });

  const publicClient = createPublicClient({ chain, transport, pollingInterval: 100 });
  const walletClient = createWalletClient({ chain, transport, account: executor, pollingInterval: 100 });
  const artifacts = compileSettlementContracts();

  const usdcHash = await walletClient.deployContract({
    abi: artifacts.mockUsdc.abi,
    bytecode: artifacts.mockUsdc.bytecode,
    account: executor,
    chain,
    gas: 3_000_000n,
  });
  const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
  const usdcAddress = usdcReceipt.contractAddress as Address;
  if (!usdcAddress) throw new Error("USDC_DEPLOY_FAILED");

  const settlementHash = await walletClient.deployContract({
    abi: artifacts.mocSettlement.abi,
    bytecode: artifacts.mocSettlement.bytecode,
    args: [executor.address, usdcAddress],
    account: executor,
    chain,
    gas: 3_000_000n,
  });
  const settlementReceipt = await publicClient.waitForTransactionReceipt({ hash: settlementHash });
  const contractAddress = settlementReceipt.contractAddress as Address;
  if (!contractAddress) throw new Error("SETTLEMENT_DEPLOY_FAILED");

  async function mint(to: Address, amount: bigint) {
    const hash = await walletClient.writeContract({
      address: usdcAddress,
      abi: mockUsdcAbi,
      functionName: "mint",
      args: [to, amount],
      account: executor,
      chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function approve(amount: bigint) {
    const hash = await walletClient.writeContract({
      address: usdcAddress,
      abi: mockUsdcAbi,
      functionName: "approve",
      args: [contractAddress, amount],
      account: executor,
      chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  await mint(executor.address, 10_000_000n);
  await approve(2n ** 256n - 1n);

  const config: BaseSettlementConfig = {
    chainId,
    contractAddress,
    usdcAddress,
    executorAddress: executor.address,
    assetSymbol: "USDC",
    tokenDecimals: 6,
    contractVersion: MOC_SETTLEMENT_VERSION,
    waitForConfirmation: true,
    receiptTimeoutMs: 5_000,
  };

  return {
    config,
    chain: createViemBaseChainPort({
      publicClient,
      walletClient,
      contractAddress,
      usdcAddress,
      account: executor,
    }),
    executor,
    beneficiary: beneficiaryAccount.address,
    beneficiaryB: beneficiaryBAccount.address,
    attacker: attackerAccount.address,
    executorAddress: executor.address,
    usdcAddress,
    contractAddress,
    publicClient,
    walletClient,
    transport,
    chainDef: chain,
    mint,
    approve,
    async close() {
      await provider.disconnect?.();
    },
  };
}
