# ADR-013 — Fan Economy Persistence & Transactional Consistency

| Field | Value |
|-------|-------|
| **Purpose** | Decide how persistence guarantees the atomicity, idempotency, and concurrency rules of Fan Economy without making a blockchain the domain authority. |
| **Dependencies** | [ADR Index](./README.md) · [CDR-009](../../cdr/CDR-009-fan-economy-reward-protocol.md) · [ADR-002](./ADR-002-postgresql-prisma.md) · [ADR-010](./ADR-010-hexagonal-ports.md) · [ADR-011](./ADR-011-identity-tenancy.md) · [Economic & Rights Foundation](../../MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [On-chain execution boundary](../../MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) |
| **Status** | Accepted |
| **Owner** | Architecture |
| **Last Updated** | 2026-09-23 |
| **Related Documents** | [ADR Index](./README.md) · [CDR-009 v1.0.0](../../cdr/CDR-009-fan-economy-reward-protocol.md) · [ADR-002](./ADR-002-postgresql-prisma.md) · [ADR-005](./ADR-005-base-usdc-settlement.md) · [ADR-010](./ADR-010-hexagonal-ports.md) · [Hub](../../README.md) |

<!-- doc-id: backend-architecture/adr/ADR-013-fan-economy-persistence-transactional-consistency.md -->

- **Status:** Accepted
- **Date:** 2026-09-23
- **Canonical source:** [CDR-009 — Fan Economy & Reward Protocol v1.0.0](../../cdr/CDR-009-fan-economy-reward-protocol.md), accepted 2026-09-23

This ADR decides how persistence makes CDR-009 true. It does not change what CDR-009 requires. Invariants I-01 through I-34 stay as written there.

The decision is generic. It applies to any Artist Actor, Fan Actor, Participant Actor, Verification authority, Protocol Treasury Authority, Campaign, Mission, and distributable Release. Named pilot fixtures are not rules of this ADR.

## Context

CDR-009 freezes four commands whose success is all-or-nothing: AuthorizeReward, ReleaseReward, RedeemReward, and ReverseRedemption. PurchasingPower, standing, and availableToAuthorize are derived. The only economic bridge is Redemption → Revenue. SettlementIntent is later and accepts only an EconomicEntitlement.

The reconstructed kernel persists in the application database through Prisma. `EconomicsStore.putAssessed` writes Revenue and its EconomicEntitlements in one `prisma.$transaction`. `putSettlement` writes entitlement status, EconomicSettlement, and EconomicPayment in a **different** transaction. The store is constructed with the root client. It cannot today enlist those writes in a caller's transaction.

ADR-002 names PostgreSQL as the production OLTP store and Prisma as the adapter mapper, not the domain. The current app datasource may be SQLite. Both expose a single-database transaction. ADR-008 describes an outbox and Nest workers for sale royalties. That path is not the writer of the reconstructed economic kernel. ADR-001's Nest host is not the runtime of this kernel.

Fan Economy must not grow a second revenue engine, a stored purchasing-power balance, or a chain as its ledger.

## Decision

### 1. Authoritative store

For the MVP, authoritative Fan Economy state is domain persistence in the OLTP database:

| Authoritative | Not an authoritative balance |
|---------------|------------------------------|
| Campaign, including committed amount | standing |
| Mission (entity of Campaign) | availableToAuthorize |
| MissionAssignment | PurchasingPower |
| Evidence record (not the blob) | wallet balance |
| Verification | frontend state |
| RewardEntitlement | agent memory |
| Redemption | social-platform state |
| | blockchain state of Fan Economy |

A blob store may hold evidence bytes. The domain record holds the integrity reference. A later ADR may add chain proof or reserve custody behind a port. That proof does not become the domain authority of these aggregates.

### 2. Transactional model

Each of the four commands runs in **one relational transaction** on the OLTP database. Where the command also writes the economic kernel, those kernel writes use the **same** transaction.

This is enough because every fact that must commit together already lives in one database: Fan Economy rows and `EconomicRevenue` / `EconomicEntitlement`. The kernel already groups revenue and entitlements in a Prisma transaction. The missing capability is to share that transaction with the Fan Economy writes.

Rejected for these commands: a distributed saga, a message broker, eventual consistency between consumption and Revenue, an outbox as the success path, and a blockchain transaction as the domain commit. ADR-008's outbox remains a sale-royalty mechanism. It is not the RedeemReward success path.

SQLite in local development must honor the same all-or-nothing boundary. Production follows ADR-002 (PostgreSQL). The ADR does not add a second database.

### 3. AuthorizeReward

One transaction. Commit only if all of these hold on the state read inside that transaction:

- the cited Verification is the current accepted Verification for the MissionAssignment
- the assignment is eligible and has no RewardEntitlement
- amount > 0, amount ≤ Mission.maximumReward, same asset and scale
- after the grant, standing ≤ committed for that asset and scale
- exactly one RewardEntitlement is inserted, citing that Verification

Any failure rolls the transaction back. No partial grant.

Concurrency: a uniqueness constraint on one RewardEntitlement per MissionAssignment. Two concurrent grants for the same assignment cannot both insert. Capacity: the transaction locks the Campaign row, recomputes standing from RewardEntitlements, and inserts only if the new standing ≤ committed. Two grants cannot both pass that check for the same capacity.

Retry of the same assignment with the same amount, asset, scale, and Verification returns the existing RewardEntitlement. A different payload for an assignment that already has one is a conflict and does not mutate.

### 4. RedeemReward

One transaction produces all of the following, or none:

- RewardEntitlement: remaining decreases and consumed increases by the redeemed amount
- one Redemption whose identity, payload, amount, target, and Revenue relationship are immutable
- exactly one Revenue for that Redemption
- the Distribution snapshot taken for that Revenue
- the EconomicEntitlements produced by that Revenue

If the Release is not distributable under the existing kernel rules, the transaction commits nothing.

No committed state may contain consumption without that Revenue, a Revenue without the consumption, or a Redemption without its Revenue. SettlementIntent, execution, and EconomicSettlement are **not** part of this transaction. They happen later, on the existing settlement path.

### 5. Kernel participation

RedeemReward and ReverseRedemption call the existing economic engine and persist through the existing EconomicsStore **inside the command transaction**. ADR-013 does not add a second `recordRevenue`, a second entitlement writer, or a bypass of kernel invariants (beneficiary is an ActorRef, shares sum to 10_000 bps, unbound participants reject, allocations sum to the net).

The store port must accept the transaction already opened by the command. `putAssessed` today opens its own transaction on the root client. That is not sufficient for RedeemReward. The implementation will pass the same transactional context into the kernel write. ADR-014 decides origin representation, the Distribution snapshot call, the FeePolicy version, and the API. ADR-013 only decides that those writes, once ADR-014 defines them, join this transaction.

### 6. ReleaseReward

One transaction, authorized only for the Fan Actor who owns the RewardEntitlement (CDR-009 I-31):

- remaining decreases by X
- released increases by X
- consumed is unchanged
- Revenue and EconomicEntitlement are untouched

standing falls by X because it is the sum of consumed + remaining. availableToAuthorize rises by X only because it is committed − standing. Neither figure is updated as its own balance.

ReleaseReward and RedeemReward that touch the same remaining serialize on that RewardEntitlement. They cannot both spend the same unit.

### 7. ReverseRedemption

X is the **complete** amount of that Redemption. Partial reversal does not exist.

One transaction, or none:

- consumed decreases by X and remaining increases by X on the same RewardEntitlement
- released is unchanged, so standing and availableToAuthorize are unchanged
- the Redemption enters `reversed` without rewriting its original identity, payload, amount, target, or Revenue relationship
- that Revenue is invalidated
- every EconomicEntitlement produced only by that Revenue and still reversible is invalidated

The Fan Actor may request reversal of their own Redemption. Domain policy performs the kernel writes. The fan does not update Revenue or EconomicEntitlement directly.

If any EconomicEntitlement of that Revenue is already irreversibly settled, the transaction does not start a partial undo. The command fails with no change. This ADR does not add compensation.

Kernel reversal of a redemption-origin Revenue is legal only inside this command (I-33). A non-redemption Revenue keeps the kernel's existing reversal path.

### 8. Reversal versus settlement

Irreversible settlement confirmation and ReverseRedemption serialize on the EconomicEntitlements of that Revenue.

- If reversal commits first, those entitlements are no longer settleable. A later settlement confirmation must not mark them settled.
- If irreversible settlement commits first, ReverseRedemption fails.

`putSettlement` already updates entitlement status and inserts EconomicSettlement in one transaction. ReverseRedemption must take the same rows in its transaction and refuse to invalidate an entitlement that this confirmation has already settled. The two transactions cannot both commit their conflicting writes. No compensation flow is added. A failed or UNKNOWN execution that has not irreversibly settled does not block reversal and does not by itself restore purchasing power.

### 9. Idempotency

| Command | Key already in the domain | Persistence rule |
|---------|---------------------------|------------------|
| RedeemReward | `redemptionId` plus canonical payload | Same id and same payload return the existing Redemption, Revenue, and entitlements. No second consumption. Same id and a different payload reject with no mutation. |
| AuthorizeReward | one RewardEntitlement per MissionAssignment | Same assignment and same grant payload return the existing entitlement. A different payload conflicts. |
| ReverseRedemption | the Redemption id | The first success reverses it once. A retry of that reversed Redemption returns the reversed result and does not move amounts again. |
| ReleaseReward | none | Entitlement id does not make two releases of the same amount one operation. The command carries its own idempotency key so a retry does not release twice. |

The release key is required because domain identity does not provide the retry guarantee. The other three commands must not grow an extra public key.

### 10. Concurrency

Smallest combination that holds on PostgreSQL (production) and on a transactional SQLite development database:

| Guarantee | Mechanism |
|-----------|-----------|
| One RewardEntitlement per MissionAssignment | unique constraint |
| One result per `redemptionId` | unique constraint, payload compared on conflict |
| `consumed + released ≤ authorized`, and release cannot share a unit with redemption | conditional update of the RewardEntitlement row inside the transaction (expected remaining / consumed / released). A mismatch is a concurrency conflict, not a partial write |
| `standing ≤ committed` | lock the Campaign row in the authorize transaction and recompute standing before insert |
| Reversal and irreversible settlement cannot both commit | the settlement-confirmation transaction and the reversal transaction update the same EconomicEntitlement rows; the database rejects the loser |

Optimistic concurrency on the entitlement is enough for redeem, release, and reverse. It is not enough alone for campaign capacity, because two transactions can each see room and each insert. The campaign row lock covers that case only. Serializable isolation for every Fan Economy read is not required.

A concurrency conflict may be retried after re-reading. A domain rejection must not be retried as if it were a conflict.

### 11. Derived values

Persisted on each RewardEntitlement: authorized, consumed, released. Derived:

```text
remaining = authorized − consumed − released
```

Campaign, per asset and scale:

```text
standing = SUM(consumed + remaining) = SUM(authorized − released)
availableToAuthorize = committed − standing
```

PurchasingPower for an Actor is the sum of remaining on redeemable RewardEntitlements of that Actor, grouped only when asset and scale match. Reversed entitlements contribute nothing.

These three figures are not columns that commands increment. A later read model may cache them. The cache is a projection. If it disagrees with the sums, the sums win.

### 12. Failure model

| Class | What happens |
|-------|----------------|
| Domain rejection | The transaction does not commit. Invalid amount, ineligible assignment, non-distributable Release, settled downstream on reversal, payload conflict. |
| Concurrency conflict | Rollback. The caller may retry after re-reading. |
| Persistence failure | Rollback of the whole command, including any kernel rows in that transaction. |
| Kernel write failure during RedeemReward or ReverseRedemption | Same rollback. Fan Economy rows do not remain. |
| Settlement failure or UNKNOWN after a committed RedeemReward | The Redemption stays. PurchasingPower is not restored. standing is not changed. |

### 13. Database and blockchain

CDR-009 already requires explicit authority, auditable transitions, deterministic invariants, anti-replay of `redemptionId`, and a boundary between domain and execution. A single-database transaction provides those for Fan Economy without placing Campaign, Mission, RewardEntitlement, or Redemption on a chain.

Settlement execution stays on the existing adapter and ADR-005. That rail is not the Fan Economy ledger. A future ADR may anchor proofs or custody. It must not replace this store as domain authority.

### 14. Ports

Aggregate ownership, not one repository per table:

| Port | Owns |
|------|------|
| Campaign repository | Campaign aggregate: definition, committed lines, Mission entities |
| MissionAssignment repository | MissionAssignment aggregate: Evidence entities, Verification records |
| RewardEntitlement repository | RewardEntitlement aggregate |
| Redemption repository | Redemption aggregate, including the immutable original facts and the later `reversed` state |
| Unit of work | Opens the command transaction and enlists the repositories and the kernel store writes |

Evidence bytes use the existing content port (ADR-004). They are not a Fan Economy aggregate. EconomicsStore remains the kernel port. It gains the ability to join an outer transaction. It is not reimplemented.

### 15. Schema implications

Not a migration. A later schema must be able to enforce the following.

**Must enforce**

- at most one MissionAssignment per Fan Actor and Mission
- at most one RewardEntitlement per MissionAssignment
- unique Redemption id
- Redemption original payload, amount, target, and revenue reference are not updated in place; reversal is a state transition
- RewardEntitlement amounts share one asset and scale; consumed, released, and remaining stay non-negative and sum to authorized
- Campaign committed amount is per asset and scale and is not decreased by these four commands
- Revenue written by RedeemReward is the Revenue referenced by that Redemption

**Likely implementation**

- conditional version or expected-amount columns on RewardEntitlement
- a uniqueness constraint that stores the canonical redemption payload hash beside `redemptionId`
- append-only transition rows (decision 16)
- campaign row available to lock

Column-level design waits for the migration that implements this ADR. Prisma stays an adapter. Domain types do not import it (ADR-002).

### 16. Auditability

MVP audit is in the database, not on a chain. Each successful authorization, release, redemption, and reversal appends a transition that a reader can use to reconstruct:

- which ActorRef (or which protocol policy id, for a policy assignment or a verification) acted
- which command
- when
- the authority (fan owner, verification citation, domain reversal policy)
- the prior amounts
- the resulting amounts and, for redemption, the Revenue id

The Verification id cited by authorization is part of that authorization record. Wallet addresses are not identity on these rows. A destination wallet may appear later only on the existing settlement record, as a capability, not as the fan or the beneficiary.

### 17. Alternatives

| Option | Verdict | Why |
|--------|---------|-----|
| A. Blockchain as Fan Economy source of truth | Reject | Breaks blockchain independence. Settlement on the existing rail does not require the fan aggregates on-chain. |
| B. Saga or eventual consistency for RedeemReward | Reject | Allows consumption without Revenue, or the reverse. CDR-009 forbids that success state. |
| C. Persisted mutable PurchasingPower | Reject | A second ledger. The sum of remaining is the value. |
| D. A separate Fan Economy revenue engine | Reject | The kernel already writes Revenue and entitlements. A second writer splits the bridge. |
| E. MOCSettlement V1 as campaign vault | Reject | That contract settles an entitlement instruction. It is not reserve custody. Custody is a later ADR. |
| F. One database transaction with the existing kernel | Accept | Matches where the rows live and the kernel's current `putAssessed` grouping. |
| G. Optimistic concurrency alone | Reject as the only tool | It protects one RewardEntitlement. It does not stop two authorizations from both seeing reserve room. |
| H. Serializable isolation on every Fan Economy transaction | Reject as the default | Stronger than the races require. Unique keys, a conditional entitlement update, and a campaign-row lock are enough. |

### 18. Boundary with ADR-014

ADR-014 — Fan Economy Redemption → Economic Kernel Integration — will decide:

- how a Redemption is represented as Revenue origin
- how the Distribution snapshot is taken from Release Participation at that write
- which FeePolicy version applies, without a buyer charge above the redeemed amount
- API request and response shape
- UI behavior

ADR-013 stops before those choices. ADR-014 must use the transaction in decision 2 and must not open a second revenue path.

## Consequences

**Positive:** RedeemReward and ReverseRedemption cannot leave a half-written bridge. Derived balances cannot drift by being stored. The existing settlement path stays after the domain commit.

**Negative:** `EconomicsStore` must learn to join an outer transaction. AuthorizeReward locks a Campaign row. ReleaseReward needs an idempotency key the domain does not already have.

**Rule:** no implementation of these commands may commit Fan Economy effects in one transaction and kernel effects in another.

## Non-normative fixtures

Automated tests and at least one settlement execution helper bind named catalog fixtures and a fixed destination. Those fixtures are not production actors, releases, shares, or authorization rules. This ADR does not adopt them. The commands apply to any valid actors and any distributable Release.

## Consistency with CDR-009

Checked against I-01 through I-34. No invariant is redefined. In particular: I-09 and I-19 (redemption idempotency and the success triple), I-10 and I-34 (standing and no decrease of committed), I-17 and I-28 (amount identity and serialization), I-20 and I-21 and I-32 (one entitlement, all-or-nothing authorization, mission maximum), I-22 and I-30 (redemption and reversal do not free reserve), I-23 (no half success), I-24 (snapshot is inside the redeem commit; the snapshot rule itself is ADR-014), I-26 (settlement is outside this transaction and still only accepts an EconomicEntitlement), I-27 and I-31 (full reversal, named authority), I-33 (kernel reversal of a redemption Revenue only inside ReverseRedemption).
