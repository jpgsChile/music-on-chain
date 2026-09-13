import fs from "node:fs";
import path from "node:path";
import { BASE_MAINNET_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from "./sepoliaGuard";
import { readSepoliaLiveCredentials } from "./sepoliaEnv";
import { setupControlledMockUsdcOnSepolia } from "./sepoliaDeploy";
import { MOC_SETTLEMENT_VERSION } from "./abi";

function upsertEnvLocal(updates: Record<string, string>, cwd = process.cwd()): void {
  const file = path.join(cwd, ".env.local");
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    text = "";
  }
  const keys = new Set(Object.keys(updates));
  const lines = text.split("\n");
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return true;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    return !keys.has(key);
  });
  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();
  kept.push("");
  for (const [key, value] of Object.entries(updates)) {
    kept.push(`${key}=${value}`);
  }
  kept.push("");
  fs.writeFileSync(file, kept.join("\n"), "utf8");
}

async function main() {
  const creds = readSepoliaLiveCredentials();
  if (creds.chainId === BASE_MAINNET_CHAIN_ID) {
    throw new Error("MAINNET_FORBIDDEN");
  }
  if (creds.chainId !== BASE_SEPOLIA_CHAIN_ID) {
    throw new Error("WRONG_CHAIN");
  }

  const setup = await setupControlledMockUsdcOnSepolia(creds, (row) => {
    console.info("[moc-sepolia-asset]", JSON.stringify(row));
  });

  if (setup.chainId !== BASE_SEPOLIA_CHAIN_ID) throw new Error("WRONG_CHAIN");
  if (Number(setup.decimals) !== 6) throw new Error("ASSET_VALIDATION");
  if (setup.symbol !== "USDC") throw new Error("ASSET_VALIDATION");
  if (setup.settlementVersion !== MOC_SETTLEMENT_VERSION) throw new Error("CONTRACT_ERROR");
  if (setup.settlementExecutor.toLowerCase() !== setup.executorAddress.toLowerCase()) {
    throw new Error("SIGNER_ERROR");
  }
  if (setup.settlementAsset.toLowerCase() !== setup.asset.address.toLowerCase()) {
    throw new Error("CONTRACT_ERROR");
  }
  if (setup.executorTokenBalance !== setup.mintUnits) throw new Error("ASSET_VALIDATION");
  if (setup.settlementAllowance !== setup.mintUnits) throw new Error("ASSET_VALIDATION");

  upsertEnvLocal({
    MOC_SETTLEMENT_CHAIN_ID: String(BASE_SEPOLIA_CHAIN_ID),
    MOC_SETTLEMENT_ADDRESS: setup.settlement.address,
    MOC_SETTLEMENT_ASSET: setup.asset.address,
    MOC_SETTLEMENT_EXECUTOR_ADDRESS: setup.executorAddress,
    MOC_SETTLEMENT_TOKEN_DECIMALS: "6",
    MOC_SETTLEMENT_ASSET_SYMBOL: "USDC",
    MOC_SETTLEMENT_CONTRACT_VERSION: MOC_SETTLEMENT_VERSION,
  });

  console.info(
    JSON.stringify(
      {
        network: setup.network,
        chainId: setup.chainId,
        mockUsdc: setup.asset.address,
        mockUsdcDeployTx: setup.asset.deployTx,
        mockUsdcBytecodeHash: setup.assetBytecodeHash,
        decimals: setup.decimals,
        symbol: setup.symbol,
        name: setup.name,
        owner: setup.owner,
        minter: setup.minter,
        deployer: setup.executorAddress,
        executor: setup.executorAddress,
        executorTokenBalance: setup.executorTokenBalance,
        mintTx: setup.mintTx,
        mocSettlement: setup.settlement.address,
        mocSettlementDeployTx: setup.settlement.deployTx,
        mocSettlementVersion: setup.settlementVersion,
        allowance: setup.settlementAllowance,
        approveTx: setup.approveTx,
        explorer: setup.explorer,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
});
