# MOC — Development & Test Environment Architecture

| Field | Value |
|-------|-------|
| **Purpose** | Define the four settlement test profiles so daily development does not depend on Base Sepolia, faucets, or external wallets. |
| **Dependencies** | [Documentation Hub](./README.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Sepolia runbook](./MOC-BASE-SEPOLIA-RUNBOOK.md) |
| **Status** | Active |
| **Owner** | Architecture / Settlement |
| **Last Updated** | 2026-09-13 |
| **Related Documents** | [Hub](./README.md) · [Sepolia deployment](./MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md) · [Sepolia runbook](./MOC-BASE-SEPOLIA-RUNBOOK.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) |

<!-- doc-id: MOC-DEVELOPMENT-TEST-ENVIRONMENT-ARCHITECTURE.md -->

## Principle

The environment changes. The meaning of MOC does not.

```
WEB3 TRUST-NATIVE MOC
         │
┌────────┴────────┐
│                 │
SEMÁNTICA      EJECUCIÓN
MOC Domain     Adapters → Local EVM | Fork | Base Sepolia
```

`Domain ≠ Persistence ≠ Execution ≠ Blockchain`

`ActorRef ≠ Wallet ≠ TransactionHash`

The faucet is **not** part of everyday MOC development.

## Profiles

| Profile | `EVM_ENV` | Tool | chainId | Network | Faucet |
|---------|-----------|------|---------|---------|--------|
| Unit / domain | `local` (default) | Vitest | — | none | **NO** |
| EVM local | `local` | Ganache in-process (Foundry/Anvil optional) | **31337** | none | **NO** |
| Base Sepolia fork | `fork` | Ganache fork of Sepolia | **84532** | read-only RPC | **NO** |
| Base Sepolia real | `base-sepolia` | Public RPC + host signer | **84532** | live | **ONLY if executor ETH is 0** |

Base Mainnet (`8453`) is forbidden in all of these paths (`MAINNET_FORBIDDEN`).

## Commands

| Command | What runs | Needs Sepolia? |
|---------|-----------|----------------|
| `npm test` | Unit / domain / adapter (in-memory) | **NO** |
| `npm run test:e2e` | Local EVM: contract + domain E2E + matrix EVM-01…12 | **NO** |
| `npm run test:fork` | Optional Sepolia fork | RPC only; **no ETH**, **no signer** |
| `npm run test:sepolia` | Live controlled integration | RPC + signer + ≥ 0.003 ETH |
| `npm run test:contracts` | Foundry `forge test` if installed | **NO** |

`npm test` **does not** load `sepolia.live.test.ts`. Credentials in `.env.local` cannot trigger a live settlement from the default test command.

## Local EVM

Reuses the existing in-process Ganache chain (`startLocalSettlementChain`). Foundry is configured (`foundry.toml`) but **not required** for daily work. `anvil` / `forge` are optional.

Deterministic accounts (Anvil well-known keys, **test-only**):

| Role | Purpose |
|------|---------|
| EXECUTOR | Authorized `settle` caller; auto-funded native ETH + MockUSDC |
| BENEFICIARY_A | Intended payment capability (not ActorRef) |
| BENEFICIARY_B | Wrong-beneficiary / mismatch cases |
| ATTACKER | Unauthorized caller |

Token: existing **MockUSDC** (6 decimals). TEST ASSET — not production USDC.

Local E2E:

`Actor → EconomicEntitlement → SettlementIntent → ExecutionRequest → adapter → MOCSettlement → MockUSDC → SettlementReceipt → reconcile`

No Base Sepolia, no external RPC, no faucet, no host wallet.

## Fork

`npm run test:fork` uses `BASE_SEPOLIA_RPC_URL` (or `MOC_SETTLEMENT_RPC_URL`) only.

- If the URL is missing: fork suite is **SKIPPED** (gate test still passes).
- If the RPC is unreachable: the live fork case logs `SKIPPED` and does not fail the unit suite.
- Local accounts are still auto-funded. **No testnet ETH.**
- Forked chainId must be 84532. Mainnet fork is `MAINNET_FORBIDDEN`.

This profile is **optional**. It is not a dependency of `npm test` or `npm run test:e2e`.

## Base Sepolia real

Unchanged. See [Runbook](./MOC-BASE-SEPOLIA-RUNBOOK.md).

`GAS_ERROR` remains for the **real** executor native balance check. Do not lower it for local/fork.

## Variables

Daily development needs none of these.

```bash
EVM_ENV=local

# Optional fork
BASE_SEPOLIA_RPC_URL=

# Live Sepolia only (never commit values)
# MOC_SETTLEMENT_ADAPTER=mock
# Studio: set MOC_SETTLEMENT_ADAPTER=base only when intending a real Sepolia transfer.
BASE_EXECUTOR_PRIVATE_KEY=
MOC_SETTLEMENT_ADDRESS=
MOC_SETTLEMENT_ASSET=
```

## Test matrix

| Capability | Unit | EVM local | Fork | Base Sepolia |
|------------|------|-----------|------|--------------|
| Actor / Rights / Revenue | ✓ | | | |
| Entitlement / Intent | ✓ | ✓ | | |
| Contract deploy | | ✓ | ✓ | ✓ |
| ERC-20 transfer | | ✓ | ✓ | ✓ |
| SettlementExecuted | | ✓ | ✓ | ✓ |
| Replay | ✓ | ✓ | ✓ | ✓ |
| Receipt | | ✓ | ✓ | ✓ |
| Reconciliation | ✓ | ✓ | ✓ | ✓ |
| Real RPC | | | ✓ | ✓ |
| Real transaction | | | | ✓ |
| External signer | | | | ✓ |
| Faucet | NO | NO | NO | only if unfunded |

## Mainnet safety

- `assertNotMainnetChainId` / `assertBaseSepoliaChainId`
- `readEvmEnvProfile` rejects `mainnet` / `8453`
- `readBaseSettlementEnv` and `createBaseSettlementAdapterWithSigner` reject 8453
- `startLocalSettlementChain({ chainId: 8453 })` throws
- Live deploy already refuses 8453

## Troubleshooting

| Symptom | Profile | Action |
|---------|---------|--------|
| Need a faucet to run `npm test` | — | You should not. Run `npm test` then `npm run test:e2e`. |
| `GAS_ERROR` | Sepolia real | Fund the printed **executorAddress** with Sepolia ETH. Local/fork do not use this guard. |
| Live test runs during `npm test` | — | Should not happen; live file is excluded from the default include. |
| `forge: not found` | Foundry | **NOT REQUIRED**. Use `npm run test:e2e`. |
| Fork skipped | Fork | Set `BASE_SEPOLIA_RPC_URL` or ignore; unit/e2e still pass. |

## Trust-Native

The local EVM does not make the wallet an Actor and does not make `transactionHash` a `SettlementIntent` or `ActorRef`.
