import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  getAddress,
  getContractAddress,
  http,
  keccak256,
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
  gasShortageMessage,
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
    throw new Error(gasShortageMessage(balance));
  }
  return balance;
}

/**
 * Deploy MockUSDC (test-only) + MOCSettlement V1 on Base Sepolia.
 * Never logs the executor key.
 */
export const SEPOLIA_CONTROLLED_MINT_UNITS = 10_000_000n; // 10 MockUSDC (6 decimals)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForContractCode(
  publicClient: PublicClient,
  address: Address,
  attempts = 30
): Promise<Hex> {
  for (let i = 0; i < attempts; i += 1) {
    const code = await publicClient.getCode({ address });
    if (code && code !== "0x") return code;
    await sleep(1_000);
  }
  throw new Error("CONTRACT_ERROR");
}

export async function assertExecutorCanCoverEstimatedGas(
  publicClient: PublicClient,
  executor: Address
): Promise<bigint> {
  const [balance, gasPrice] = await Promise.all([
    publicClient.getBalance({ address: executor }),
    publicClient.getGasPrice(),
  ]);
  const needed = 12_000_000n * gasPrice;
  if (balance < needed) {
    throw new Error(
      `GAS_ERROR: balance=${formatEther(balance)} ETH required>=${formatEther(needed)} ETH (estimated)`
    );
  }
  return balance;
}

export async function deployMocSettlementToSepolia(
  creds: SepoliaLiveCredentials,
  log: (row: SepoliaSafeLog) => void = () => undefined,
  options?: { enforceMinExecutorWei?: boolean }
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
  if (options?.enforceMinExecutorWei === false) {
    await assertExecutorCanCoverEstimatedGas(publicClient, account.address);
  } else {
    await assertExecutorFunded(publicClient, account.address);
  }

  const artifacts = compileSettlementContracts();
  if (!artifacts.mockUsdc.bytecode.startsWith("0x") || artifacts.mockUsdc.bytecode.length < 100) {
    throw new Error("CONTRACT_ERROR:BYTECODE");
  }
  const chain = sepoliaChain(creds.rpcUrl);

  let usdcAddress: Address;
  let usdcHash: Hash;
  const existingAsset = creds.assetAddress
    ? (getAddress(creds.assetAddress) as Address)
    : undefined;
  if (existingAsset) {
    const existingCode = await waitForContractCode(publicClient, existingAsset, 5).catch(() => "0x" as Hex);
    if (!existingCode || existingCode === "0x") throw new Error("CONTRACT_ERROR:EXISTING_ASSET");
    usdcAddress = existingAsset;
    usdcHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    log({
      chainId,
      network: "base-sepolia",
      executorAddress: account.address,
      assetAddress: usdcAddress,
      status: "mockusdc-reused",
    });
  } else {
    const nonce = await publicClient.getTransactionCount({ address: account.address });
    const predicted = getContractAddress({ from: account.address, nonce: BigInt(nonce) });
    usdcHash = await walletClient.deployContract({
      abi: artifacts.mockUsdc.abi,
      bytecode: artifacts.mockUsdc.bytecode,
      account,
      chain,
      gas: 3_000_000n,
    });
    log({
      chainId,
      network: "base-sepolia",
      executorAddress: account.address,
      transactionHash: usdcHash,
      status: "mockusdc-submitted",
    });
    const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
    if (usdcReceipt.status !== "success") throw new Error("CONTRACT_ERROR:USDC_TX");
    usdcAddress = (usdcReceipt.contractAddress ?? predicted) as Address;
    await waitForContractCode(publicClient, usdcAddress);
  }

  let settlementAddress: Address;
  let settlementHash: Hash;
  let settlementBlock = "0";
  const existingSettlement = creds.contractAddress
    ? (getAddress(creds.contractAddress) as Address)
    : undefined;
  if (existingSettlement) {
    await waitForContractCode(publicClient, existingSettlement, 5);
    settlementAddress = existingSettlement;
    settlementHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    log({
      chainId,
      network: "base-sepolia",
      executorAddress: account.address,
      contractAddress: settlementAddress,
      assetAddress: usdcAddress,
      status: "settlement-reused",
    });
  } else {
    const settlementNonce = await publicClient.getTransactionCount({ address: account.address });
    const predictedSettlement = getContractAddress({ from: account.address, nonce: BigInt(settlementNonce) });
    settlementHash = await walletClient.deployContract({
      abi: artifacts.mocSettlement.abi,
      bytecode: artifacts.mocSettlement.bytecode,
      args: [account.address, usdcAddress],
      account,
      chain,
      gas: 3_000_000n,
    });
    log({
      chainId,
      network: "base-sepolia",
      executorAddress: account.address,
      assetAddress: usdcAddress,
      transactionHash: settlementHash,
      status: "settlement-submitted",
    });
    const settlementReceipt = await publicClient.waitForTransactionReceipt({ hash: settlementHash });
    if (settlementReceipt.status !== "success") throw new Error("CONTRACT_ERROR:SETTLEMENT_TX");
    settlementAddress = (settlementReceipt.contractAddress ?? predictedSettlement) as Address;
    await waitForContractCode(publicClient, settlementAddress);
    settlementBlock = settlementReceipt.blockNumber.toString();
  }

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
      blockNumber: settlementBlock,
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

export type ControlledSepoliaAssetSetup = SepoliaDeployment & {
  decimals: number;
  symbol: string;
  name: string;
  owner: Address;
  minter: Address;
  mintUnits: string;
  executorTokenBalance: string;
  settlementAllowance: string;
  assetBytecodeBytes: number;
  assetBytecodeHash: Hex;
  settlementBytecodeBytes: number;
  settlementVersion: string;
  settlementExecutor: Address;
  settlementAsset: Address;
  mintTx: Hash;
  approveTx: Hash;
};

export async function setupControlledMockUsdcOnSepolia(
  creds: SepoliaLiveCredentials,
  log: (row: SepoliaSafeLog) => void = () => undefined
): Promise<ControlledSepoliaAssetSetup> {
  const deployment = await deployMocSettlementToSepolia(creds, log, {
    enforceMinExecutorWei: false,
  });
  const { account, publicClient, walletClient } = createSepoliaClients(
    creds.rpcUrl,
    creds.executorKey
  );
  const chain = sepoliaChain(creds.rpcUrl);

  const ZERO_HASH =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash;
  let mintHash = ZERO_HASH;
  let approveHash = ZERO_HASH;
  const currentBalance = await publicClient.readContract({
    address: deployment.asset.address,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (currentBalance < SEPOLIA_CONTROLLED_MINT_UNITS) {
    mintHash = await walletClient.writeContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "mint",
      args: [account.address, SEPOLIA_CONTROLLED_MINT_UNITS - currentBalance],
      account,
      chain,
      gas: 200_000n,
    });
    const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
    if (mintReceipt.status !== "success") throw new Error("CONTRACT_ERROR:MINT");
  }

  const currentAllowance = await publicClient.readContract({
    address: deployment.asset.address,
    abi: mockUsdcAbi,
    functionName: "allowance",
    args: [account.address, deployment.settlement.address],
  });
  if (currentAllowance < SEPOLIA_CONTROLLED_MINT_UNITS) {
    approveHash = await walletClient.writeContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "approve",
      args: [deployment.settlement.address, SEPOLIA_CONTROLLED_MINT_UNITS],
      account,
      chain,
      gas: 100_000n,
    });
    const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
    if (approveReceipt.status !== "success") throw new Error("CONTRACT_ERROR:APPROVE");
  }

  const [
    decimals,
    symbol,
    name,
    owner,
    minter,
    executorBalance,
    allowance,
    assetCode,
    settlementCode,
    version,
    settlementExecutor,
    settlementAsset,
  ] = await Promise.all([
    publicClient.readContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "decimals",
    }),
    publicClient.readContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "name",
    }),
    publicClient.readContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "owner",
    }),
    publicClient.readContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "minter",
    }),
    publicClient.readContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: deployment.asset.address,
      abi: mockUsdcAbi,
      functionName: "allowance",
      args: [account.address, deployment.settlement.address],
    }),
    publicClient.getCode({ address: deployment.asset.address }),
    publicClient.getCode({ address: deployment.settlement.address }),
    publicClient.readContract({
      address: deployment.settlement.address,
      abi: mocSettlementAbi,
      functionName: "VERSION",
    }),
    publicClient.readContract({
      address: deployment.settlement.address,
      abi: mocSettlementAbi,
      functionName: "executor",
    }),
    publicClient.readContract({
      address: deployment.settlement.address,
      abi: mocSettlementAbi,
      functionName: "asset",
    }),
  ]);

  if (!assetCode || assetCode === "0x") throw new Error("CONTRACT_ERROR");
  if (!settlementCode || settlementCode === "0x") throw new Error("CONTRACT_ERROR");

  return {
    ...deployment,
    decimals: Number(decimals),
    symbol,
    name,
    owner,
    minter,
    mintUnits: SEPOLIA_CONTROLLED_MINT_UNITS.toString(),
    executorTokenBalance: executorBalance.toString(),
    settlementAllowance: allowance.toString(),
    assetBytecodeBytes: (assetCode.length - 2) / 2,
    assetBytecodeHash: keccak256(assetCode),
    settlementBytecodeBytes: (settlementCode.length - 2) / 2,
    settlementVersion: version,
    settlementExecutor,
    settlementAsset,
    mintTx: mintHash,
    approveTx: approveHash,
  };
}

