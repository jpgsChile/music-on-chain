# MOC — Economic & Rights Foundation

| Field | Value |
|-------|-------|
| **Purpose** | Record the first economic and rights foundation of Music On Chain: Rights, Revenue, Distribution, Entitlement, Settlement, and Fees as Web3-native domain semantics prior to on-chain execution. |
| **Dependencies** | [Documentation Hub](./README.md) · [Web3 Trust-Native domain](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [C-BIND/1](./C-BIND.md) · [Standards](./_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture / Domain |
| **Last Updated** | 2026-09-13 |
| **Related Documents** | [Hub](./README.md) · [Web3 Trust-Native domain](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [C-BIND/1](./C-BIND.md) · [Artist Profile](./ARTIST_PROFILE.md) · [On-chain execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Persistent economic ledger](./MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION.md) · [First real band pilot](./MOC-FIRST-REAL-BAND-PILOT.md) |

<!-- doc-id: MOC-ECONOMIC-RIGHTS-FOUNDATION.md -->

## Purpose

Give MOC a verifiable economic domain **before** blockchain settlement, tokenization, or payment rails.

```text
Actor → Participation / Rights → Revenue → Fees → Net
      → Distribution → Entitlement → Settlement → Payment
```

`RIGHT ≠ ENTITLEMENT ≠ REVENUE ≠ DISTRIBUTION ≠ SETTLEMENT ≠ PAYMENT`

Wallet, token, and chain transaction are not rights.

## Model

| Concept | Meaning |
|---------|---------|
| Sale | Commercial fact. Not revenue. |
| Revenue | Gross economic inflow (minor units + asset). |
| FeeAssessment | Protocol fee (creator pool) and convenience fee (buyer), from a **versioned policy**. |
| Net distributable | Gross minus protocol fee. |
| DistributionRule | Actor shares in bps of net. Not UI percentages. |
| EconomicEntitlement | Actor-owned claim with provenance. Exists before settlement. |
| Settlement | Executes an entitlement. Does not create it. |
| Payment | Record of the settlement execution. |
| DomainRight | Actor–object relationship. Not a percentage and not a token. |

Money is `{ units: bigint, scale, asset }`. Not float. Not implicitly USD/USDC.

## Fee model

Product policy v1 (`MOC_PRODUCT_FEE_POLICY_V1`): 500 bps protocol fee, separate convenience fee (0 bps until product sets it). Creator share is derived (`10000 - protocolFeeBps`). Policy is versionable; it is not a kernel constant hardcoded across the app.

## Invariants

- Beneficiary is always `ActorRef`.
- Entitlement has reconstructable origin (revenue → distribution → source).
- Settlement references entitlement; beneficiary is copied, not redefined.
- Same revenue cannot be distributed twice.
- Same entitlement cannot be settled twice.
- Rounding uses largest remainder and is conservative (allocations sum to net).
- Participation ≠ Right ≠ revenue share.

## Provenance

Engine events: `RevenueRecorded`, `FeesAssessed`, `RevenueDistributed`, `EntitlementAccrued`.

## Wallet / domain

Wallet may appear on Settlement as `destinationWallet` (execution capability). It is never the beneficiary.

## Participation-sourced distribution

When Studio records revenue against a **Release**, the server derives `Distribution` from persisted `Participation.revenueSharePercent` (`source.kind = participation`). Basis points are `percent × 100`. The sum must be `10000`; the engine rejects otherwise and does not normalize.

`beneficiary` is `ActorRef` after the collaborator authenticates (Privy → AuthSubject → C-BIND/1) and accepts an invite. Email, wallet, and Privy `user.id` are not beneficiaries. Binding does **not** create `DomainRight`. Participation ≠ Rights.

Unbound rows (`actorRef` null) reject the revenue with `PARTICIPANTS_UNBOUND`.

## Limits

- No blockchain, smart contracts, tokenization, IPFS/Arweave, escrow, or payment rails.
- Prisma models exist as a persistence mapping; the live API uses an in-memory store so SQLite need not be migrated yet.
- Marketplace `lib/purchase.ts` and royalty-engine UI remain Mock.
- Refunds/reversals after settlement are prepared (`reversed` status) but not a full refund product.

## Next stage

Execution boundary: [MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md).  
Next product stage: Smart Contract & Base Settlement Implementation (not started).
