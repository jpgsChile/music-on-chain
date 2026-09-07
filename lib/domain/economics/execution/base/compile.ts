import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type CompiledContract = {
  abi: unknown[];
  bytecode: `0x${string}`;
};

export type SettlementArtifacts = {
  mocSettlement: CompiledContract;
  mockUsdc: CompiledContract;
  revertingToken: CompiledContract;
  silentFailToken: CompiledContract;
};

type SolcOutput = {
  errors?: Array<{ severity: string; formattedMessage: string }>;
  contracts?: Record<string, Record<string, { abi: unknown[]; evm: { bytecode: { object: string } } }>>;
};

function contractsRoot(): string {
  return path.join(process.cwd(), "contracts/src");
}

function read(rel: string): string {
  return fs.readFileSync(path.join(contractsRoot(), rel), "utf8");
}

/**
 * Compile MOCSettlement V1 with the same solc version as foundry.toml (0.8.24).
 * Used by Vitest so contract tests run without a global Foundry install.
 */
export function compileSettlementContracts(): SettlementArtifacts {
  const solc = require("solc") as {
    compile: (input: string, opts?: { import: (p: string) => { contents?: string; error?: string } }) => string;
  };

  const sources: Record<string, { content: string }> = {
    "MOCSettlement.sol": { content: read("MOCSettlement.sol") },
    "interfaces/IMOCSettlement.sol": { content: read("interfaces/IMOCSettlement.sol") },
    "mocks/MockUSDC.sol": { content: read("mocks/MockUSDC.sol") },
    "mocks/NonStandardTokens.sol": { content: read("mocks/NonStandardTokens.sol") },
  };

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object"] },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: (importPath: string) => {
        const normalized = importPath.replace(/^\.\//, "");
        if (sources[normalized]) return { contents: sources[normalized].content };
        const nested = path.posix.normalize(normalized);
        if (sources[nested]) return { contents: sources[nested].content };
        return { error: `File not found: ${importPath}` };
      },
    })
  ) as SolcOutput;

  const errors = (output.errors ?? []).filter((row) => row.severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map((row) => row.formattedMessage).join("\n"));
  }

  return {
    mocSettlement: pick(output, "MOCSettlement.sol", "MOCSettlement"),
    mockUsdc: pick(output, "mocks/MockUSDC.sol", "MockUSDC"),
    revertingToken: pick(output, "mocks/NonStandardTokens.sol", "RevertingToken"),
    silentFailToken: pick(output, "mocks/NonStandardTokens.sol", "SilentFailToken"),
  };
}

function pick(output: SolcOutput, file: string, name: string): CompiledContract {
  const contract = output.contracts?.[file]?.[name];
  if (!contract?.evm?.bytecode?.object) {
    throw new Error(`Missing bytecode for ${file}:${name}`);
  }
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object.replace(/^0x/, "")}`,
  };
}
