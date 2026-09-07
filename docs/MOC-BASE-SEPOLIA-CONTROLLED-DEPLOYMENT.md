# MOC — Base Sepolia Controlled Deployment

| Field | Value |
|-------|-------|
| **Purpose** | Record the controlled Base Sepolia (chainId 84532) deployment, execution, and reconciliation path for MOCSettlement V1. Not production. |
| **Dependencies** | [Documentation Hub](./README.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Runbook](./MOC-BASE-SEPOLIA-RUNBOOK.md) |
| **Status** | Active |
| **Owner** | Architecture / Settlement |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [Hub](./README.md) · [Runbook](./MOC-BASE-SEPOLIA-RUNBOOK.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Threat model](./MOC-BASE-ONCHAIN-SETTLEMENT-THREAT-MODEL.md) · [C-BIND/1](./C-BIND.md) |

<!-- doc-id: MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md -->

## Principle

MOC decides what to settle and for whom. The adapter executes. Base Sepolia provides evidence. `Blockchain ≠ Domain Truth`.

A transaction does **not** prove Actor identity, rights, revenue, fees, or entitlement origin.

## Live run (this machine)

| Field | Value |
|-------|-------|
| Date | 2026-09-07 |
| Commit (tooling) | see git `feat(moc): deploy and reconcile Base Sepolia settlement` |
| chainId required | **84532** (mainnet 8453 is forbidden) |
| Live execution | **NOT RUN** |
| Classification | `SIGNER_ERROR` / `CONFIGURATION_ERROR` |

`BASE_EXECUTOR_PRIVATE_KEY` and `BASE_SEPOLIA_RPC_URL` were not present in the local environment. No transaction was sent. No addresses were invented.

To complete the live proof, follow the [Runbook](./MOC-BASE-SEPOLIA-RUNBOOK.md) and re-run `npm run test:sepolia`.

## Deployment (when credentials exist)

Record after a successful `deployMocSettlementToSepolia`:

| Field | Source |
|-------|--------|
| network | `base-sepolia` |
| chainId | `84532` (read from provider, not assumed) |
| contract | `MOCSettlement` / `MOC-SETTLEMENT-V1` |
| address | `deployment.settlement.address` |
| deployer / executor | signer address only (never the key) |
| asset | MockUSDC — **TEST ASSET, NOT PRODUCTION USDC** |
| deploymentTx | `deployment.settlement.deployTx` |
| blockNumber | settlement receipt |

Post-deploy reads: `VERSION()`, `executor()`, `asset()`, `getCode(address) !== 0x`.

Explorer (verify the host, then the path): `https://sepolia.basescan.org/address/<contract>` and `https://sepolia.basescan.org/tx/<hash>`.

## Execution

The live test creates a domain `EconomicEntitlement`, opens a stable `SettlementIntent`, and executes via `createBaseSettlementAdapterWithSigner`.

| Field | Rule |
|-------|------|
| intentRef | Stable for retries (`intent:sepolia:<timestamp>`) |
| requestRef | Preserved end-to-end; not derived from tx hash |
| beneficiary | Test wallet capability (not ActorRef) |
| amount | `1000` minor units (0.001 of 6-decimal test asset) |
| status SUBMITTED | After send, before receipt |
| status CONFIRMED | Receipt success **and** `SettlementExecuted` matches intent |

## Reconciliation

`adapter.reconcile({ request, previous })` queries Base Sepolia (`transactionHash`, logs, `executed(intentRef)`, chainId, contract). Prisma/SQLite are not the evidence source.

| State | Meaning |
|-------|---------|
| SUBMITTED | Hash known, receipt not yet used |
| CONFIRMED | Matching `SettlementExecuted` |
| FAILED | Revert / mismatch / failed pre-check |
| UNKNOWN | Sent or observed with insufficient evidence — **not** auto-FAILED |

Event mismatch does **not** become CONFIRMED.

## Replay

Second `settle` for the same `intentRef` must not transfer again. On-chain `AlreadyExecuted`. Domain entitlement count stays 1.

## Failure

Insufficient allowance/balance → `FAILED`, entitlement remains `accrued`.

## Security

- Signer lives only in `BASE_EXECUTOR_PRIVATE_KEY` (host env / `.env` / `.env.local`, gitignored).
- Never printed. Never in `.env.example`.
- chainId must be 84532; 8453 throws `MAINNET_FORBIDDEN`.
- Executor address from the key must match `MOC_SETTLEMENT_EXECUTOR_ADDRESS` when that variable is set.
- Receipt `to` must equal `MOCSettlement`.
- Minimum executor ETH: **0.003** (see `SEPOLIA_MIN_EXECUTOR_WEI`).

## Tests (this machine)

| Check | Result |
|-------|--------|
| Vitest (domain + contract + adapter + integration) | **PASS** (125 passed, 1 skipped = live Sepolia) |
| Live Sepolia (`npm run test:sepolia`) | **NOT RUN** — missing `BASE_SEPOLIA_RPC_URL` + `BASE_EXECUTOR_PRIVATE_KEY` (`SIGNER_ERROR` / `CONFIGURATION_ERROR`) |
| Foundry `forge test` | **NOT RUN** — `forge` not installed; Vitest compiles the same 0.8.24 bytecode |
| Typecheck `tsc --noEmit` | **PASS** |
| `next build` | **PASS** |
| `next lint` | **PRE-EXISTING** — Next 16 treats `lint` as a project directory (`.../music-on-chain/lint`); ESLint does not run |
| `docs:validate` | **PASS** |
