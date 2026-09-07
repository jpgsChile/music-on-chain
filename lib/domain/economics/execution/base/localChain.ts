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

const require = createRequire(import.meta.url);

/** Well-known local test key. Never used in production. Never logged. */
export const LOCAL_EXECUTOR_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
export const LOCAL_BENEFICIARY_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;

export const LOCAL_CHAIN_ID = 84532;

export type LocalSettlementChain = {
  config: BaseSettlementConfig;
  chain: BaseChainPort;
  executor: Account;
  beneficiary: Address;
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
 * No public RPC. No Privy. No Base network access.
 */
export async function startLocalSettlementChain(options?: {
  chainId?: number;
}): Promise<LocalSettlementChain> {
  const ganache = require("ganache") as {
    provider: (opts: Record<string, unknown>) => {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      disconnect?: () => Promise<void>;
    };
  };

  const chainId = options?.chainId ?? LOCAL_CHAIN_ID;
  const executor = privateKeyToAccount(LOCAL_EXECUTOR_KEY);
  const beneficiaryAccount = privateKeyToAccount(LOCAL_BENEFICIARY_KEY);

  const provider = ganache.provider({
    chain: { chainId, hardfork: "berlin" },
    miner: { blockTime: 0 },
    wallet: {
      accounts: [
        { secretKey: LOCAL_EXECUTOR_KEY, balance: "0x3635c9adc5dea00000" },
        { secretKey: LOCAL_BENEFICIARY_KEY, balance: "0x3635c9adc5dea00000" },
      ],
    },
    logging: { quiet: true },
  });

  const chain = defineChain({
    id: chainId,
    name: "moc-local-base",
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
