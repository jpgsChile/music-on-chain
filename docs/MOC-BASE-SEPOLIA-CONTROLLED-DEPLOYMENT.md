# MOC — Base Sepolia Controlled Deployment

| Field | Value |
|-------|-------|
| **Purpose** | Record the controlled Base Sepolia (chainId 84532) deployment, execution, and reconciliation path for MOCSettlement V1. Not production. |
| **Dependencies** | [Documentation Hub](./README.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Runbook](./MOC-BASE-SEPOLIA-RUNBOOK.md) |
| **Status** | Active |
| **Owner** | Architecture / Settlement |
| **Last Updated** | 2026-09-13 |
| **Related Documents** | [Hub](./README.md) · [Runbook](./MOC-BASE-SEPOLIA-RUNBOOK.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Threat model](./MOC-BASE-ONCHAIN-SETTLEMENT-THREAT-MODEL.md) · [C-BIND/1](./C-BIND.md) |

<!-- doc-id: MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md -->

## Principle

MOC decides what to settle and for whom. The adapter executes. Base Sepolia provides evidence. `Blockchain ≠ Domain Truth`.

A transaction does **not** prove Actor identity, rights, revenue, fees, or entitlement origin.

## Live run (this machine)

| Field | Value |
|-------|-------|
| Date | 2026-09-13 |
| chainId (on-chain) | **84532** |
| Mainnet 8453 | Forbidden (`MAINNET_FORBIDDEN`) |
| Studio adapter | Default remains `MockExecutionAdapter`. First real Vengeance settlements below used Base adapter **in-process only** (`MOC_SETTLEMENT_ADAPTER=base` for the CLI, not in `.env.local`). |

### Controlled MockUSDC (TEST ASSET — NOT production USDC)

| Field | Value |
|-------|-------|
| address | `0x54aa6b5f077bD75634C2F7390c7df73B2e24BdED` |
| deploy tx | `0x2f419dd911eb30f73a8c56bc232242686c7d1c30766fe87f88e97f72245dc4f5` |
| runtime bytecode hash | `0x45a55b8726d922588bf2468b0f598816f74a3828ad95f5f33f3f2cab9d42d074` |
| name / symbol / decimals | Mock USDC / `USDC` / `6` |
| owner / minter / deployer | `0x0656D65986816A2F4006a2b6C4092Fae3bFfE751` |
| mint | 10 MockUSDC (`10000000` units) to executor |
| mint tx | `0xd0eb79ef1fac2717e3fcf17fd6ec4587a163b75e3a990a620febacf36aabbfd8` |
| explorer | https://sepolia.basescan.org/address/0x54aa6b5f077bD75634C2F7390c7df73B2e24BdED |

### MOCSettlement V1 (unchanged bytecode; constructor asset = MockUSDC)

| Field | Value |
|-------|-------|
| address | `0x2061f8A1f8A76885d606f98313ba72c1A931D61F` |
| deploy tx | `0x0cf912ddca3a2649f5f2992c567984b981374965953f4266214d560a942e1886` |
| runtime bytecode hash | `0xe04266f3f51fe611b01fadff054389ddee26eb2ac843213fbe83de5cc5d4419a` |
| VERSION | `MOC-SETTLEMENT-V1` |
| executor | `0x0656D65986816A2F4006a2b6C4092Fae3bFfE751` |
| asset() | `0x54aa6b5f077bD75634C2F7390c7df73B2e24BdED` |
| allowance(executor, settlement) | `10000000` (limited; not unlimited) |
| approve tx | `0xdfa7b82a833fff996f3a98dd16fb39e31ba8538087138a50b320a403a84facfb` |
| explorer | https://sepolia.basescan.org/address/0x2061f8A1f8A76885d606f98313ba72c1A931D61F |

Host env (gitignored): `MOC_SETTLEMENT_ADDRESS`, `MOC_SETTLEMENT_ASSET`, `MOC_SETTLEMENT_EXECUTOR_ADDRESS`, `MOC_SETTLEMENT_CHAIN_ID=84532`. Do **not** persist `MOC_SETTLEMENT_ADAPTER=base` in `.env.local` (that would send Studio/Vitest through live Base). First multi-actor proof: `npx tsx lib/domain/economics/execution/base/sepoliaRealSettlement.cli.ts pablo|carlos` (sets the adapter in-process). `npm run test:sepolia` was **not** run for this proof: it deploys a **new** contract and a synthetic intent, which is out of scope for existing Vengeance entitlements.

## First real multi-actor settlement (Vengeance, existing entitlements)

Not MockExecutionAdapter. Not production. Existing accrued rows only; no new Revenue / Distribution / Entitlement.

Beneficiary = `EconomicEntitlement.actorRef`. Wallet = destination capability from `ActorWallet`.

| Field | Pablo | Carlos |
|-------|-------|--------|
| ActorRef | `moc:actor:d219d488-f1ff-413b-abd9-3b3e23503358` | `moc:actor:9d838ad4-4242-4074-9f29-97cf454fe76e` |
| Wallet (destination) | `0xDf79C70cb632Df5ac68d084E4209dacbA65DA5d5` | `0x80c7C70cC4a8Ad0Bf01AaE32d9aBBE2fA877c841` |
| Entitlement | `rev:245c0209-e4de-42e7-b1de-72a681567a24:ent:1` | `rev:889eff20-6161-4590-9ebc-87278eda0fbc:ent:0` |
| Amount | 190000 (0.19 MockUSDC) | 760000 (0.76 MockUSDC) |
| Intent | `intent:rev:245c0209-e4de-42e7-b1de-72a681567a24:ent:1` | `intent:rev:889eff20-6161-4590-9ebc-87278eda0fbc:ent:0` |
| Request | `req:intent:rev:245c0209-e4de-42e7-b1de-72a681567a24:ent:1:0` | `req:intent:rev:889eff20-6161-4590-9ebc-87278eda0fbc:ent:0:0` |
| tx | [`0x3d5011…417b5`](https://sepolia.basescan.org/tx/0x3d5011335a31c16e56778b58477e3de1ebfa4239c685851cf89f8efa196417b5) | [`0xfdecca…43090`](https://sepolia.basescan.org/tx/0xfdecca3fcab60a0412ff522aa5c675024e8fce81a9881f30f7f34c645ee43090) |
| block / logIndex | 46787557 / 166 | 46787618 / 169 |
| ERC-20 `balanceOf` after | 190000 | 760000 (before 0) |
| Replay | Same `transactionHash`; no second transfer | Same `transactionHash`; no second transfer |
| Isolation | Carlos / Cleaver `openSettlementIntent` → `NOT_BENEFICIARY` | Pablo / Cleaver → `NOT_BENEFICIARY` |

`SettlementExecuted` fields matched intentRef, beneficiary wallet, MockUSDC, amount. Receipt `CONFIRMED` persisted in SQLite (`adapter: base`, `onChain: true`, `simulated: false`). Studio copy for that receipt: Confirmado on-chain · On-chain · Base Sepolia + full tx hash (not “Liquidación simulada”). Remaining Carlos accrued 760000 rows were **not** settled.

Asset setup: `npm run setup:sepolia-mockusdc`.

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
| Live Sepolia (`npm run test:sepolia`) | **NOT RUN** for this proof (synthetic deploy). Vengeance multi-actor: **PASS** via `sepoliaRealSettlement.cli.ts` |
| Foundry `forge test` | **NOT RUN** — `forge` not installed; Vitest compiles the same 0.8.24 bytecode |
| Typecheck `tsc --noEmit` | **PASS** |
| `next build` | **PASS** |
| `next lint` | **PRE-EXISTING** — Next 16 treats `lint` as a project directory (`.../music-on-chain/lint`); ESLint does not run |
| `docs:validate` | **PASS** |
