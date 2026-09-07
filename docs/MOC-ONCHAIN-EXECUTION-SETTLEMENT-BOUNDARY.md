# MOC — On-chain Execution & Settlement Boundary

| Field | Value |
|-------|-------|
| **Purpose** | Record the boundary between MOC economic domain and on-chain execution, so an EconomicEntitlement can later be settled on blockchain without changing domain meaning. |
| **Dependencies** | [Documentation Hub](./README.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [Web3 Trust-Native domain](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [C-BIND/1](./C-BIND.md) |
| **Status** | Active |
| **Owner** | Architecture / Domain |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [Hub](./README.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [Web3 Trust-Native domain](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [C-BIND/1](./C-BIND.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) |

<!-- doc-id: MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md -->

## Domain vs Execution

```text
WHAT must happen     →  EconomicEntitlement / Settlement (MOC domain)
HOW it is executed   →  SettlementIntent → ExecutionRequest → Adapter → Receipt
```

`ENTITLEMENT ≠ TRANSACTION`. `RIGHT ≠ TOKEN`. `ACTOR ≠ WALLET`. `SETTLEMENT ≠ BLOCKCHAIN TX`.

## Entitlement

Unchanged. Beneficiary is Actor. No wallet, chain, or transaction fields.

## SettlementIntent

`intentRef` is the idempotency key. It names a valid Entitlement MOC wants to fulfill. It is not a blockchain transaction.

## ExecutionRequest

Derived from the intent. Includes `beneficiaryActorRef`, optional `destinationCapability` (ActorWallet), `amount` + `asset`, and `executionMode` (`off-chain` | `on-chain`). No chainId or tx hash.

## Adapter

`SettlementExecutionAdapter.execute(request) → ExecutionResult`.

Current implementation: `MockSettlementExecutionAdapter` (in-process, no RPC) and `createBaseSettlementAdapter` (Base / MOCSettlement V1). Both implement `SettlementExecutionAdapter`.

Outcomes: `ACCEPTED` | `SUBMITTED` | `CONFIRMED` | `FAILED` | `UNKNOWN`.

`SUBMITTED ≠ CONFIRMED`. The domain completes Settlement only when the adapter reports `CONFIRMED` and the receipt matches the intent.

## Receipt

`SettlementReceipt` is external evidence (`externalRef` may later hold a tx hash). It is not EntitlementRef, SettlementRef, or ActorRef.

## Idempotency and retries

Retry uses the same `intentRef`. Confirmed or submitted intents return the existing receipt (no second settlement). Failed intents may retry without creating a new Entitlement. Unknown is not treated as failed.

## Failure and unknown

Failed or unknown execution leaves the Entitlement accrued. Rights and revenue are untouched.

## Wallet capability

Destination is `ActorWallet` / `destinationCapability`. Changing wallet does not change the Entitlement.

## Blockchain boundary

chainId, transactionHash, contractAddress, RPC, gas live only in adapter metadata / receipt. Not on Actor, Right, Revenue, Distribution, or Entitlement.

## Future smart contracts

Implemented in [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md):

```text
SettlementIntent → BaseSettlementAdapter → MOCSettlement V1 → USDC transfer → Receipt
```

without changing Actor / Rights / Revenue / Distribution / Entitlement.

## Limits

No ERC-4337, escrow, splits, tokenization, IPFS/Arweave, or production Base deploy in the execution-boundary stage. The Base adapter and MOCSettlement V1 live in a later document.

## Tests

`lib/domain/economics/execution/execution.test.ts` (tests 1–24).
