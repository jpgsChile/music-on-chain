import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Account,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mocSettlementAbi, mockUsdcAbi, MOC_SETTLEMENT_VERSION } from "./abi";
import { compileSettlementContracts } from "./compile";
import {
  BASE_SEPOLIA_CHAIN_ID,
  SEPOLIA_MIN_EXECUTOR_WEI,
  assertBaseSepoliaChainId,
  sepoliaContractUrl,
  sepoliaTxUrl,
} from "./sepoliaGuard";
import type { SepoliaLiveCredentials } from "./sepoliaEnv";

export type SepoliaSafeLog = {
  chainId?: number;
  network?: string;
  executorAddress?: string;
  contractAddress?: string;
  assetAddress?: string;
  transactionHash?: string;
  status?: string;
};

export type SepoliaDeployment = {
  network: "base-sepolia";
  chainId: typeof BASE_SEPOLIA_CHAIN_ID;
  commit?: string;
  deployedAt: string;
  executorAddress: Address;
  asset: {
    kind: "TEST_ASSET";
    symbol: string;
    note: "TEST ASSET — NOT PRODUCTION USDC";
    address: Address;
    deployTx: Hash;
  };
  settlement: {
    version: string;
    address: Address;
    deployTx: Hash;
    blockNumber: string;
  };
  explorer: {
    settlement: string;
    settlementTx: string;
    asset: string;
  };
};

function sepoliaChain(rpcUrl: string) {
  return defineChain({
    id: BASE_SEPOLIA_CHAIN_ID,
    name: "base-sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

export function createSepoliaClients(rpcUrl: string, executorKey: Hex): {
  account: Account;
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const account = privateKeyToAccount(executorKey);
  const chain = sepoliaChain(rpcUrl);
  const transport = http(rpcUrl);
  return {
    account,
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({ chain, transport, account }),
  };
}

export async function assertSepoliaNetwork(publicClient: PublicClient): Promise<number> {
  const chainId = await publicClient.getChainId();
  assertBaseSepoliaChainId(chainId);
  return chainId;
}

export async function assertExecutorFunded(publicClient: PublicClient, executor: Address): Promise<bigint> {
  const balance = await publicClient.getBalance({ address: executor });
  if (balance < SEPOLIA_MIN_EXECUTOR_WEI) {
    throw new Error("GAS_ERROR");
  }
  return balance;
}

/**
 * Deploy MockUSDC (test-only) + MOCSettlement V1 on Base Sepolia.
 * Never logs the executor key.
 */
export async function deployMocSettlementToSepolia(
  creds: SepoliaLiveCredentials,
  log: (row: SepoliaSafeLog) => void = () => undefined
): Promise<SepoliaDeployment> {
  const { account, publicClient, walletClient } = createSepoliaClients(creds.rpcUrl, creds.executorKey);
  const chainId = await assertSepoliaNetwork(publicClient);
  log({
    chainId,
    network: "base-sepolia",
    executorAddress: account.address,
  });
  if (account.address.toLowerCase() !== creds.executorAddress.toLowerCase()) {
    throw new Error("EXECUTOR_KEY_ADDRESS_MISMATCH");
  }
  await assertExecutorFunded(publicClient, account.address);

  const artifacts = compileSettlementContracts();
  const chain = sepoliaChain(creds.rpcUrl);

  const usdcHash = await walletClient.deployContract({
    abi: artifacts.mockUsdc.abi,
    bytecode: artifacts.mockUsdc.bytecode,
    account,
    chain,
    gas: 3_000_000n,
  });
  const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
  const usdcAddress = usdcReceipt.contractAddress as Address | undefined;
  if (!usdcAddress) throw new Error("CONTRACT_ERROR");
  const usdcCode = await publicClient.getCode({ address: usdcAddress });
  if (!usdcCode || usdcCode === "0x") throw new Error("CONTRACT_ERROR");

  const settlementHash = await walletClient.deployContract({
    abi: artifacts.mocSettlement.abi,
    bytecode: artifacts.mocSettlement.bytecode,
    args: [account.address, usdcAddress],
    account,
    chain,
    gas: 3_000_000n,
  });
  const settlementReceipt = await publicClient.waitForTransactionReceipt({ hash: settlementHash });
  const settlementAddress = settlementReceipt.contractAddress as Address | undefined;
  if (!settlementAddress) throw new Error("CONTRACT_ERROR");
  const settlementCode = await publicClient.getCode({ address: settlementAddress });
  if (!settlementCode || settlementCode === "0x") throw new Error("CONTRACT_ERROR");

  const [version, executor, asset] = await Promise.all([
    publicClient.readContract({
      address: settlementAddress,
      abi: mocSettlementAbi,
      functionName: "VERSION",
    }),
    publicClient.readContract({
      address: settlementAddress,
      abi: mocSettlementAbi,
      functionName: "executor",
    }),
    publicClient.readContract({
      address: settlementAddress,
      abi: mocSettlementAbi,
      functionName: "asset",
    }),
  ]);
  if (version !== MOC_SETTLEMENT_VERSION) throw new Error("CONTRACT_ERROR");
  if (executor.toLowerCase() !== account.address.toLowerCase()) throw new Error("SIGNER_ERROR");
  if (asset.toLowerCase() !== usdcAddress.toLowerCase()) throw new Error("CONTRACT_ERROR");

  log({
    chainId,
    network: "base-sepolia",
    executorAddress: account.address,
    contractAddress: settlementAddress,
    assetAddress: usdcAddress,
    transactionHash: settlementHash,
    status: "deployed",
  });

  return {
    network: "base-sepolia",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    deployedAt: new Date().toISOString(),
    executorAddress: account.address,
    asset: {
      kind: "TEST_ASSET",
      symbol: creds.assetSymbol,
      note: "TEST ASSET — NOT PRODUCTION USDC",
      address: usdcAddress,
      deployTx: usdcHash,
    },
    settlement: {
      version: MOC_SETTLEMENT_VERSION,
      address: settlementAddress,
      deployTx: settlementHash,
      blockNumber: settlementReceipt.blockNumber.toString(),
    },
    explorer: {
      settlement: sepoliaContractUrl(settlementAddress),
      settlementTx: sepoliaTxUrl(settlementHash),
      asset: sepoliaContractUrl(usdcAddress),
    },
  };
}

export async function fundTestAssetAndApprove(input: {
  creds: SepoliaLiveCredentials;
  assetAddress: Address;
  settlementAddress: Address;
  amount: bigint;
}): Promise<void> {
  const { account, publicClient, walletClient } = createSepoliaClients(
    input.creds.rpcUrl,
    input.creds.executorKey
  );
  const chain = sepoliaChain(input.creds.rpcUrl);
  const mintHash = await walletClient.writeContract({
    address: input.assetAddress,
    abi: mockUsdcAbi,
    functionName: "mint",
    args: [account.address, input.amount],
    account,
    chain,
    gas: 200_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  const approveHash = await walletClient.writeContract({
    address: input.assetAddress,
    abi: mockUsdcAbi,
    functionName: "approve",
    args: [input.settlementAddress, input.amount],
    account,
    chain,
    gas: 100_000n,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
}
