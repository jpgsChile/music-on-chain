# ADR-014 — Fan Economy Redemption → Economic Kernel Integration

| Field | Value |
|-------|-------|
| **Purpose** | Decide how a successful Redemption becomes one Revenue, one Distribution snapshot, and EconomicEntitlements in the existing kernel. |
| **Dependencies** | [ADR-013](./ADR-013-fan-economy-persistence-transactional-consistency.md) · [CDR-009](../../cdr/CDR-009-fan-economy-reward-protocol.md) · [ADR-002](./ADR-002-postgresql-prisma.md) · [ADR-005](./ADR-005-base-usdc-settlement.md) |
| **Status** | Accepted |
| **Owner** | Architecture |
| **Last Updated** | 2026-09-23 |
| **Related Documents** | [ADR Index](./README.md) · [CDR-009 v1.0.0](../../cdr/CDR-009-fan-economy-reward-protocol.md) · [ADR-013](./ADR-013-fan-economy-persistence-transactional-consistency.md) · [Economic & Rights Foundation](../../MOC-ECONOMIC-RIGHTS-FOUNDATION.md) |

<!-- doc-id: backend-architecture/adr/ADR-014-fan-economy-redemption-economic-kernel-integration.md -->

- **Status:** Accepted
- **Date:** 2026-09-23
- **Canonical sources:** CDR-009 v1.0.0, ADR-013. This ADR does not change either.

Scope is the bridge only: Redemption → Revenue → Distribution → EconomicEntitlement. Settlement stays on the existing path.

## Context

`RevenueOrigin` is `{ kind: "sale" | "other"; id: string }`. `recordRevenue` defaults origin to `sale` when a Sale is present, otherwise `other`. `recordRevenueOnce` does not accept an origin, so a caller cannot name a redemption. `putAssessed` stores `originKind` and `originId` as strings. On read, `prismaStore` maps every non-`sale` kind back to `other`. That collapse would hide the bridge.

`assessFees` always computes `buyerPays = gross + convenience`. `MOC_PRODUCT_FEE_POLICY_V1` is the sale policy: 500 bps protocol, 0 bps convenience. The kernel requires some `ProtocolFeePolicy`. It does not require that sale policy.

`distributionRuleFromParticipations` is the pure rule. `distributionRuleFromRelease` loads Participation through the global Prisma client. The snapshot must be taken inside the RedeemReward transaction from ADR-013, not through that global read.

`reverseEntitlement` changes one entitlement from `accrued` to `reversed` and rejects `settled`. It does not read origin. `EconomicRevenue` has no status column. `createSettlementIntent` accepts only an `EconomicEntitlement` and only when status is `accrued`.

## Decision

### 1. Revenue origin

Extend the existing origin. Do not add a Revenue type.

```text
{ kind: "redemption", id: redemptionId }
```

`id` is the Redemption id. `sale` and `other` stay as they are. A redemption must not be stored as `other`.

`revenueId` is `revenue:redemption:<redemptionId>`. `saleId` is absent. `releaseId` is the target Release. No wallet and no chain fields.

Persistence already has `originKind` and `originId`. The mapper must round-trip `redemption`. It must keep unknown legacy kinds as `other`, not as `redemption`.

One Redemption has at most one Revenue: unique `(originKind, originId)` plus the deterministic `revenueId`. The Redemption row stores that `revenueId`.

### 2. Value and fee policy

```text
Revenue.gross = Redemption.amount = X
```

The campaign reserve is not Revenue. PurchasingPower is not Revenue. RewardEntitlement is not EconomicEntitlement.

MVP policy, distinct from the sale policy:

```text
policyId: moc-redemption-fee-v1
version: 1
protocolFeeBps: 0
convenienceFeeBps: 0
```

The kernel then yields `netDistributable = X` and `buyerPays = X`. The whole gross is distributed. No commercial rate is introduced. `MOC_PRODUCT_FEE_POLICY_V1` is not used on this path.

Any later redemption policy must keep `convenienceFeeBps = 0`, so `buyerPays` cannot exceed X. A protocol fee, if a later version adds one, is a slice of X. Artist-funded and protocol-funded redemptions use this same version. Funding source does not select a second policy while the rate is zero.

Before commit, the command checks `buyerPays.units ≤ gross.units` and matching asset and scale. A policy that fails that check fails the redemption with no write.

### 3. Distribution snapshot

MVP target kind is `release` only. Inside the RedeemReward transaction, load that Release's Participation rows and pass them to `distributionRuleFromParticipations`. Do not call `distributionRuleFromRelease` on the global client.

The Release is distributable only when that function returns a rule:

- at least one Participation
- every Participation has an ActorRef
- every ActorRef is `moc:actor:…` and is not a wallet
- each share converts to integer bps in `0…10000`
- the shares sum to `10000`

Anything else (`EMPTY_SHARES`, `PARTICIPANTS_UNBOUND`, `SHARE_REQUIRES_ACTOR`, `WALLET_IS_NOT_BENEFICIARY`, `INVALID_SHARE_BPS`, `SHARES_MUST_SUM_TO_10000_BPS`) means the Release is not distributable. RedeemReward commits nothing. Do not repair shares.

`recordRevenue` then runs `assessFees` and `applyDistributionRule` on that rule. The historical snapshot is the persisted Distribution allocations and the EconomicEntitlement rows (ActorRef, bps, amount, source `participation` plus Participation id). `ruleId` stays `from-participation`. Later Participation edits must not update those rows. Participation is not Rights. Rights are not read.

### 4. Kernel entry and transaction

RedeemReward, inside the ADR-013 transaction:

1. Apply the consumption to the RewardEntitlement.
2. Build the DistributionRule from Participation rows read on that same transaction.
3. Call `recordRevenue` with gross X, origin `{ kind: "redemption", id: redemptionId }`, `releaseId`, `moc-redemption-fee-v1`, and that rule. No Sale.
4. Persist the assessed result through EconomicsStore on that same transaction.
5. Insert the Redemption linked to `revenueId`.

`recordRevenueOnce` must accept and forward `origin`. If origin is omitted, current sale/`other` behavior stays.

`putAssessed` today opens its own `prisma.$transaction`. Minimum change: the Prisma adapter exposes the store bound to a caller transaction. The domain port is a unit of work, not a Prisma type (ADR-002). When the outer transaction is present, kernel writes use it and do not open a second one. Memory and Prisma adapters both implement that join so tests and production share the contract.

No second assessor, no FanEconomicEntitlement, no second settlement pipeline.

### 5. Reversal protection

`origin.kind === "redemption"` is the guard.

A generic kernel reverse loads the Revenue for the entitlement. If the origin is `redemption`, it refuses with no mutation. Sale and `other` still use `reverseEntitlement` as they do now.

The only writer that may invalidate this Revenue is ReverseRedemption, on the ADR-013 transaction:

- require `origin.kind === "redemption"` and `origin.id` equal to that Redemption
- if any EconomicEntitlement of that Revenue is `settled`, fail the whole command
- otherwise set each entitlement to `reversed` via `reverseEntitlement`
- persist the Revenue itself as `reversed`

`EconomicRevenue` cannot record that status today. The implementation adds one status on that row (`recorded` or `reversed`), default `recorded`. Sale rows stay `recorded`. Generic reverse does not flip them.

A reversed entitlement is not `accrued`, so `createSettlementIntent` already rejects it.

### 6. Settlement boundary

An EconomicEntitlement from this Revenue is a normal kernel entitlement. Settlement stays:

```text
EconomicEntitlement → SettlementIntent → EconomicSettlement → existing execution adapter
```

Base remains the accepted rail (ADR-005). This bridge does not add a settlement engine, a payment from RewardEntitlement, a fan token, a wallet balance, Soroban, Stellar, or a bridge. SettlementIntent is not part of RedeemReward.

### 7. Minimum implementation contract

The next task implements only this vertical slice. No Campaign or Mission UI. No full Fan Economy product. No HTTP design beyond a command that calls this bridge, if a route is required to exercise it.

Code:

1. Add `redemption` to `RevenueOrigin`. `recordRevenueOnce` forwards `origin`.
2. Add `moc-redemption-fee-v1` at 0 / 0. Do not reuse the sale policy id.
3. Prisma mapper round-trips `redemption`. Stop collapsing that kind to `other`.
4. EconomicsStore joins the caller transaction for `putAssessed` and for the reversal writes.
5. RedeemReward performs the five steps in decision 4. Gross, buyerPays, and Redemption amount are the same Money.
6. Generic reverse rejects this origin. ReverseRedemption is the only invalidation path.
7. Persist Revenue `reversed` and unique `(originKind, originId)`. That is the schema delta for this slice. Do not invent the rest of the Fan Economy schema here beyond what RedeemReward and ReverseRedemption must store to satisfy ADR-013.

Tests, with synthetic ActorRefs and a synthetic Release, never named pilot fixtures:

- one redemption produces one Revenue with that origin and gross X
- `buyerPays` equals X and net equals X
- EconomicEntitlements match the Participation snapshot and sum to the net
- a second redemption id does not create a second Revenue for the first
- same redemption id and same payload does not consume again
- unbound participant, wallet beneficiary, or shares that do not sum to 10000 write nothing
- a later Participation edit does not change the stored entitlements
- generic reverse of this Revenue throws and leaves rows unchanged
- sale Revenue reverse still works
- ReverseRedemption reverses entitlements and the Revenue together
- a settled entitlement makes ReverseRedemption fail with no change
- SettlementIntent still requires an EconomicEntitlement id and rejects a reversed one

## Consequences

The sale path keeps its origin default and its 500 bps policy. Redemption cannot be booked as `other` or reversed by the generic kernel path. The first schema touch for this bridge is the revenue status and the origin uniqueness, inside the implementation task, not in this ADR.

## Consistency

CDR-009: gross equals the redeemed amount, one Revenue per Redemption, origin is not `sale` or `other`, snapshot at success, non-distributable Release has no effects, fees only partition gross, `buyerPays ≤ X`, I-33 holds, SettlementIntent stays on EconomicEntitlement. No invariant is redefined.

ADR-013: kernel writes join the RedeemReward and ReverseRedemption transactions. This ADR does not reopen atomicity, idempotency, or the concurrency model.
