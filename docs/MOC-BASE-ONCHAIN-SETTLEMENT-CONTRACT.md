# MOC — Base On-chain Settlement Contract & Adapter

| Field | Value |
|-------|-------|
| **Purpose** | Record the first real EVM settlement path: MOCSettlement V1, Base adapter, USDC execution, receipts, and replay protection — without making blockchain the domain source of truth. |
| **Dependencies** | [Documentation Hub](./README.md) · [On-chain execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [ADR-005 Base USDC](./backend-architecture/adr/ADR-005-base-usdc-settlement.md) · [C-BIND/1](./C-BIND.md) |
| **Status** | Active |
| **Owner** | Architecture / Settlement |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [Hub](./README.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Threat model](./MOC-BASE-ONCHAIN-SETTLEMENT-THREAT-MODEL.md) · [Economic foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [ADR-005](./backend-architecture/adr/ADR-005-base-usdc-settlement.md) · [C-BIND/1](./C-BIND.md) |

<!-- doc-id: MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md -->

## Principle

The blockchain **executes and evidences** settlement. It does **not** determine who has the economic right.

`EconomicEntitlement` is prior and external. The contract receives a valid settlement instruction. It does not decide who deserves money.

```text
Trust-Native / MOC Domain
        ↓
EconomicEntitlement
        ↓
SettlementIntent
        ↓
ExecutionRequest
        ↓
Base Settlement Adapter
        ↓
MOCSettlement V1
        ↓
USDC transfer
        ↓
SettlementReceipt
        ↓
MOC Settlement
```

`DOMAIN ≠ EXECUTION ≠ BLOCKCHAIN`

## Architecture

| Layer | Owns |
|-------|------|
| Domain | Actor, Right, Revenue, Entitlement, SettlementIntent, Money + asset |
| Execution | ExecutionRequest, SettlementExecutionAdapter, SettlementReceipt |
| Blockchain | MOCSettlement, USDC, chainId, transactionHash, blockNumber, logIndex, contractAddress |

Reused (not duplicated): `SettlementIntent`, `ExecutionRequest`, `SettlementReceipt`, `SettlementExecutionAdapter` from the [execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md).

## Contract — MOC Settlement V1

- Solidity: `contracts/src/MOCSettlement.sol`
- Interface: `contracts/src/interfaces/IMOCSettlement.sol`
- Version string: `MOC-SETTLEMENT-V1` (`VERSION_NUMBER = 1`)
- Asset: ERC-20 **USDC**, amounts as `uint256` minor units (USDC = 6 decimals; never assumed 18)
- Authorization V1: **immutable executor** (`msg.sender == executor`). Option A. Privy / AuthSubject / ActorRef are not in the contract.
- Replay: `mapping(bytes32 => bool) executed` — one `intentRef` → at most one successful settle. Second call reverts `AlreadyExecuted`.
- Funding: executor holds USDC and `approve`s the contract; contract `transferFrom(executor, beneficiary, amount)`. The contract is not a treasury, wallet, or general escrow.
- Events: `SettlementExecuted(intentRef, beneficiary, asset, amount)` — on-chain evidence, not an Entitlement.

`intentRef` on-chain is `keccak256(utf8(SettlementIntent.intentRef))`. It is independent of transaction hash, nonce, gas, RPC, and block number. Retry keeps the same key.

`settle(intentRef, beneficiary, amount, token)` executes **exactly** that instruction. Wrong `token` reverts `WrongAsset`. Zero address / zero amount / zero intent revert. Failed ERC-20 transfer reverts and **does not** persist `executed`.

## Domain → chain mapping

| MOC | On-chain |
|-----|----------|
| SettlementIntent.intentRef | `bytes32` keccak256 |
| Actor beneficiary | **not stored** — wallet is destination only |
| destinationCapability (ActorWallet) | `beneficiary` address |
| Money.units + Money.asset | `uint256 amount` + immutable USDC |
| SettlementReceipt.externalRef | transaction hash (evidence only) |

Not copied on-chain: Actor, Rights, Revenue, FeePolicy, AuthSubject, Privy.

## Adapter

`createBaseSettlementAdapter` implements `SettlementExecutionAdapter`.

1. Validate request (on-chain mode, USDC + scale, destination wallet ≠ Actor).
2. Verify chainId, contract `VERSION`, asset, executor.
3. If `executed(intentRef)` already, confirm from the event (idempotent) or fail on mismatch.
4. Check allowance / balance.
5. Send `settle`.
6. `SUBMITTED` if not waiting; `UNKNOWN` if the tx was sent but the receipt is uncertain; `FAILED` if reverted or event mismatch; `CONFIRMED` only after the `SettlementExecuted` event **matches** the request.

`reconcile` polls a previous hash / on-chain `executed` flag. Retry ≠ new Entitlement ≠ new intentRef.

A transaction hash is **never** EntitlementRef, SettlementRef, or ActorRef.

## USDC approval (V1)

| Role | Action |
|------|--------|
| Who holds USDC | Settlement executor (off-chain treasury / ops wallet) |
| Who authorizes | Executor `approve(MOCSettlement, amount)` |
| Who executes | Executor calls `settle` |
| Who receives | Beneficiary wallet capability |
| Insufficient allowance / balance | Adapter returns FAILED; contract does not mark executed |

## Reconciliation

Same `SettlementIntent` can be `NOT_SUBMITTED` → `SUBMITTED` → `UNKNOWN` → `CONFIRMED` or `FAILED`. UNKNOWN is not FAILED. Correlate via `intentRef` + optional `transactionHash` + event + `contractAddress` + `chainId`.

## Network target

**Base** (chainId configured; 84532 Sepolia / 8453 mainnet). Domain is not coupled to Base. No automatic mainnet or Sepolia deploy in this stage.

### Deployment-ready (not production-deployed)

Required before a real deploy: compiled bytecode, `MOC-SETTLEMENT-V1`, chain ID, contract address, USDC address, executor address, verification procedure, executor key hosted **outside** the repo.

## Tests

- Foundry (optional): `forge test` — `contracts/test/MOCSettlement.t.sol`
- Vitest bytecode: `lib/domain/economics/execution/base/contract.test.ts` (in-process EVM, MockUSDC)
- Adapter: `base/adapter.test.ts`
- End-to-end: `base/integration.test.ts`

## Limits (V1 — intentional)

No Solidity upgrades, EIP-712, ERC-4337, paymasters, escrow, split contracts, tokenization, NFT, indexing, oracles, multi-chain routing, or production RPC. MockUSDC is test-only.

## Future

A new contract version (V2) can sit behind the same adapter interface without changing Actor, Rights, Revenue, Distribution, or Entitlement. Executor rotation / signed intents can replace immutable executor without moving economic meaning on-chain.
