# CDR-009 — MOC Fan Economy & Reward Protocol

| Field | Value |
|-------|-------|
| **Purpose** | Freeze the accepted canonical semantics of the MOC Fan Economy so fan rewards extend the Trust-Native domain without a second artist payment engine, a fan token, or a chain-defined identity. |
| **Dependencies** | [CDR index](./README.md) · [C-BIND/1](../C-BIND.md) · [Web3 Trust-Native domain](../MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [Economic & Rights Foundation](../MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [On-chain execution boundary](../MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Standards](../_system/STANDARDS.md) |
| **Status** | Accepted |
| **Owner** | Architecture / Domain |
| **Last Updated** | 2026-09-23 |
| **Related Documents** | [CDR index](./README.md) · [Hub](../README.md) · [C-BIND/1](../C-BIND.md) · [ADR index](../backend-architecture/adr/README.md) · [Web3 Trust-Native domain](../MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [Economic & Rights Foundation](../MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [On-chain execution boundary](../MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Base settlement contract](../MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [ADR-005](../backend-architecture/adr/ADR-005-base-usdc-settlement.md) · [ADR-011](../backend-architecture/adr/ADR-011-identity-tenancy.md) |

<!-- doc-id: cdr/CDR-009-fan-economy-reward-protocol.md -->

**Status: ACCEPTED.** Canonical version **1.0.0**. Acceptance date **2026-09-23**.

This record is the canonical domain contract for Fan Economy. Implementation must conform to it. It does not by itself implement product code, schema, or contracts. It does not define Solidity, Soroban, Prisma models, API routes, or percentages.

Version 1.0.0 freezes the semantics below. A later version is allowed. An incompatible semantic change requires a new CDR or an explicit supersession of CDR-009. An ADR may choose how to implement these semantics. It must not change them in silence.

---

## 1. Metadata

```text
ID:                 CDR-009
Title:              MOC Fan Economy & Reward Protocol
Kind:               Canonical Decision Record (protocol / domain)
Status:             ACCEPTED
Canonical version:  1.0.0
Acceptance date:    2026-09-23
Consumes:           C-BIND/1 1.0.0 (CDR-008) without redefining it
Does not:           select a chain, a vault, an agent, or a fee percentage
```

Frozen at 1.0.0: Actor (as already canon), Campaign, Mission, MissionAssignment, Evidence, Verification, RewardEntitlement, PurchasingPower, Redemption, RedemptionTarget, Campaign reserve semantics, and the only economic bridge Redemption → Revenue → Distribution → EconomicEntitlement → SettlementIntent → EconomicSettlement.

Preserved boundaries: Actor ≠ Wallet. RewardEntitlement ≠ EconomicEntitlement. PurchasingPower ≠ token and ≠ wallet balance. Campaign reserve ≠ Revenue and ≠ PurchasingPower. Redemption ≠ Settlement. Verification ≠ reward authorization. Participation ≠ Rights. Domain ≠ Execution ≠ Blockchain. Fan Economy ≠ royalty economy. An agent is not required and is not economic, identity, verifier, reserve, or settlement authority.

Preserved canon, not reopened here:

```text
AuthSubject ≠ Actor ≠ Wallet
Work ≠ Release ≠ Track
Participation ≠ Rights
Rights ≠ Token
EconomicEntitlement ≠ Transaction
Domain ≠ Execution ≠ Blockchain
```

---

## 2. Context

Music On Chain already has a Trust-Native kernel: Actor identity via C-BIND/1, musical Work / Release / Track, creative Participation, Rights, and an economic kernel:

```text
Revenue → Fees → Distribution → EconomicEntitlement
       → SettlementIntent → Execution → EconomicSettlement
```

The beneficiary of that kernel is an Actor. Settlement executes an entitlement; it does not create one. Wallet is a destination capability. The accepted settlement rail for **that existing kernel path** is Base/USDC ([ADR-005](../backend-architecture/adr/ADR-005-base-usdc-settlement.md)), behind a replaceable adapter. That rail is not the identity of Fan Economy. MOCSettlement V1 executes a settlement instruction. It is not a treasury and it is not a campaign reserve.

A fan reward capability is now under consideration. It must be a coherent extension of this kernel, not a side economy with its own artist payout path.

---

## 3. Problem

Without a canonical boundary, fan rewards collapse into one of the existing words — Participation, Entitlement, Credit, Campaign-as-contract — and produce a second payment engine, a transferable token, or a wallet-keyed fan.

The kernel today can record Revenue whose origin is `sale` or `other`. It has no redemption fact. EconomicEntitlement always carries `revenueId`, `distributionId`, and a royalty share. That shape is an obligation to a beneficiary of distributed revenue. It is the wrong shape for "this fan may support music with an authorized amount."

---

## 4. Strategic Intent

Add a Fan Economy context whose only economic exit into artist payment is Redemption, which creates Revenue and then uses the existing kernel.

The fan experience is discover, participate, contribute, verify, earn, and support or buy. Web3 remains available as trust infrastructure. It is not the language of the domain and not a requirement of the fan-facing flow unless a later capability truly needs an explicit step.

---

## 5. Ubiquitous Language

| Term | Meaning in this CDR |
|------|---------------------|
| Fan | An Actor in a fan role for a command. Not a second identity. |
| Campaign | Artist-controlled reward program with an identifiable reserve. |
| Mission | A definition, inside a Campaign, of a contribution the fan may attempt. |
| MissionAssignment | One Fan Actor's attempt of one Mission. |
| Evidence | A domain reference to material submitted for an assignment. The file is infrastructure. |
| Verification | A decision that evidence meets or fails the mission. Not a payment. |
| RewardEntitlement | Authorized, reserve-backed purchasing power owned by a Fan Actor. |
| PurchasingPower | Derived reading of unconsumed RewardEntitlement value. Not a stored balance and not an asset. |
| Redemption | The fan's act of spending purchasing power against a target. The only bridge into Revenue. |
| RedemptionTarget | What the redemption supports. MVP kind is Release. |
| Campaign reserve | Identifiable commitment that backs authorized rewards. Funding source is data. |
| EconomicEntitlement | Existing kernel claim of a beneficiary Actor after Revenue is distributed. Not a fan reward. |
| Participation | Existing creative/economic relationship on a Work/Release. Not a fan mission. |

**Do not use these names for Fan Economy concepts:**

| Rejected name | Why |
|---------------|-----|
| Participation | Already a creative relationship on a work/release, with a revenue share. MissionAssignment is a different aggregate. |
| EconomicEntitlement | Already the royalty claim that can enter SettlementIntent. |
| FanAccount | Pre-reconstruction identity. The fan is an Actor (ADR-011 role), not a parallel account. |
| MOC Credit | Implies a branded transferable balance. PurchasingPower is a derived reading, not a token. |
| Campaign Contract | Implies the campaign *is* a smart contract. The campaign is a domain aggregate. A later vault, if any, is an adapter. |

"Participate" in the fan experience means taking a MissionAssignment. It does not write a Participation row.

### Operations that are not synonyms

| Word | Canonical meaning |
|------|-------------------|
| Reward release | Moves **unconsumed** `remaining` → `released`. Frees authorization capacity. Creates no Revenue. Does not restore `consumed`. This is not a musical Release. |
| Musical Release | Existing catalog publication (`RedemptionTarget` kind `release`). Not a reward-release operation. |
| Redemption | Moves `remaining` → `consumed` and, in the same success, records exactly one Revenue. Does not free campaign authorization capacity. |
| Retry | Re-execution of the same idempotent command (`redemptionId` + same payload). Returns the already established result. |
| Reconciliation | Determines the outcome of an external execution that was already attempted (kernel settlement `UNKNOWN` / receipt). It does not create a new redemption and does not restore purchasing power. |
| Reversal | Moves the **complete** amount of that Redemption from `consumed` back to `remaining` on the same RewardEntitlement. A Redemption is not partially reversed. `released`, `standing`, and `availableToAuthorize` do not change. In the same success the matching Revenue and its still-reversible EconomicEntitlements are invalidated. Forbidden once that artistic value is irreversibly settled. Original identity, payload, amount, target, and Revenue relationship stay unrewritten. |
| Compensation | A new economic operation for effects that can no longer be reversed (for example, artist value already settled). Not defined in this CDR. Not an MVP path. |

Do not introduce **balance** as a domain object. PurchasingPower stays a derived reading. `availableToAuthorize` is a derived reserve figure. Neither is a stored ledger.

---

## 6. Domain Model and Aggregate Map

```text
Actor (artist)
  → Campaign                         Aggregate
       Mission                       Entity of Campaign
       Campaign reserve              Accounting state of Campaign. Not its own aggregate.
  → MissionAssignment                Aggregate (Fan Actor × Mission)
       Evidence                      Entity (integrity reference)
       Verification                  Immutable record on the assignment
  → RewardEntitlement                Aggregate
       PurchasingPower               Derived value. Not an aggregate.
  → Redemption                       Aggregate (process)
       RedemptionTarget              Value object
  → Revenue                          Existing kernel
  → Distribution → EconomicEntitlement → SettlementIntent → EconomicSettlement
```

| Concept | Classification | Boundary |
|---------|----------------|----------|
| Campaign | Aggregate | Definitions, reserve, mission entities. Does not hold per-fan attempts. |
| Mission | Entity | No independent transactional boundary. Identity is scoped by Campaign. |
| MissionAssignment | Aggregate | One fan's lifecycle for one mission. High-churn writes stay off Campaign. |
| Evidence | Entity of MissionAssignment | Domain fact plus integrity reference. Blob storage is a port. |
| Verification | Record on MissionAssignment | Not an aggregate. Not an agent. |
| RewardEntitlement | Aggregate | Own identity, authorized amount, consumed amount, lifecycle. |
| PurchasingPower | Derived value object | Computed from remaining RewardEntitlement amounts. No independent mutation. |
| Redemption | Aggregate | Idempotent consumption plus the single Revenue ingress. |
| RedemptionTarget | Value object | `{ kind, id }`. Kind `release` is the only kind this CDR enables. |

Reference other aggregates by id. Do not nest RewardEntitlement inside Campaign or EconomicEntitlement inside Redemption.

---

## 7. Actors and Roles

There is one principal: **Actor**, bound through C-BIND/1. Roles are uses of that Actor, not new identities.

| Role | What this Actor may do |
|------|------------------------|
| Artist Actor | Create and control a Campaign under policy. Commit **artist** reserve lines only. Does not commit protocol lines and does not open a second assignment path beside the mission's single mode. Does not verify their way into Revenue. Does not claw back an authorized reward. |
| Fan Actor | In `fan-accept` mode, accepts the MissionAssignment. Does not create one when the mode is `policy-assign`. Submits Evidence. Owns the RewardEntitlement. May voluntarily release unused remaining. Chooses Redemption, including a partial amount. May request reversal of their own Redemption only while its downstream value is still reversible. |
| Protocol treasury authority | Commits **protocol** reserve lines. Not an artist, fan, or verifier power. Not a wallet. |
| Verifier | Evaluate Evidence. Produce Verification (`accepted` or `rejected`). Does not create Revenue, Distribution, or EconomicEntitlement. Does not release remaining and does not reverse a Redemption. |
| Beneficiary Actor | Unchanged kernel role. Receives EconomicEntitlement only after Revenue is distributed. A fan does not become a beneficiary merely by earning a reward. |

The verifier may be an Actor or a named protocol policy. Either way, the verification record is not economic authority. Who operates the verifier in a pilot is an open question (§30), not a second protocol.

---

## 8. Campaign and Reserve

**Campaign** is the aggregate an Artist Actor controls. It names the program, holds Mission definitions, and holds the reserve record. It has no wallet, chain id, contract address, or token id.

Lifecycle (domain, not chain states):

| State | Meaning |
|-------|---------|
| `draft` | Definitions may change. No reward authorization. |
| `active` | Assignments and authorizations are allowed, subject to the reserve. |
| `closed` | No new assignments and no new authorizations. Remaining value stays redeemable until consumed or released. Reversal of already consumed value follows §14. It is not a reward release. |

**Campaign reserve** is accounting state **inside** the Campaign aggregate. Every authorized RewardEntitlement cites that reserve. The reserve is not PurchasingPower, not Revenue, not an EconomicEntitlement, not a token balance, not a blockchain balance, and not an independent economic ledger. Custody of the committed value is deferred to an ADR. This CDR does not choose it. The reserve is not MOCSettlement V1.

Funding source is an attribute of each commitment line, not a different protocol:

| Source kind | Who may commit that line |
|-------------|--------------------------|
| `artist` | The Artist Actor who controls the Campaign, according to policy. |
| `protocol` | MOC protocol treasury authority. Not the artist, not the fan, not the verifier. |
| `hybrid` | Both line kinds on the same reserve. Each line keeps its own funding authority. |

The verifier, the fan, Studio, an agent, and an external platform have no reserve authority. This CDR does not define treasury implementation.

For one Money asset and scale, each RewardEntitlement satisfies:

```text
authorized ≥ 0
consumed ≥ 0
released ≥ 0
remaining ≥ 0
consumed + released + remaining = authorized
```

`authorized` is fixed at authorization. Campaign figures:

```text
standing = SUM(consumed + remaining)
         = SUM(authorized − released)

standing ≤ committed

availableToAuthorize = committed − standing
```

Do not subtract `consumed` again. `standing` already contains it.

| Movement | Effect on availableToAuthorize |
|----------|--------------------------------|
| Redemption: `remaining → consumed` | None. Redemption does not free reserve capacity. |
| Reward release: `remaining → released` | Increases, by the released amount only. |
| Authorization | Decreases. Rejected if it would make `standing > committed`. |

`availableToAuthorize` is derived. It is not a second balance. Silent expiry is not defined (§30). An explicit reward release, invoked only by the owning Fan Actor (§16), is the only operation in this CDR that moves `remaining` to `released` and the only operation here that increases `availableToAuthorize`.

This CDR defines **no** command that decreases `committed`. A later command, if any, must keep `committed ≥ standing`. It is not designed here.

Redemption and reversal do not change `standing` (I-22, I-30). Worked amounts, one asset and scale, committed = 10:

| Step | remaining | consumed | released | standing | availableToAuthorize |
|------|-----------|----------|----------|----------|----------------------|
| Authorized 5 | 5 | 0 | 0 | 5 | 5 |
| Redeem 3 | 2 | 3 | 0 | 5 | 5 |
| Reverse that 3, downstream still reversible | 5 | 0 | 0 | 5 | 5 |
| Fan releases 2 | 3 | 0 | 2 | 3 | 7 |

No row puts PurchasingPower and an artist EconomicEntitlement on the same unit. After redeem 3, remaining is 2 and the artist claim is the Revenue of 3. After reversal, that Revenue is invalidated and remaining is 5 again. After release, those 2 are neither purchasing power nor an artist claim. They are freed authorization capacity.

---

## 9. Mission Lifecycle

**Mission** (entity of Campaign): a stable definition — criterion, **maximum reward** (Money: `maximumReward`, one asset and scale), the catalog object the mission is about, and exactly one **assignment mode**. Retiring a mission stops new assignments. It does not delete assignments or rewards already authorized. The catalog object does not restrict a later RedemptionTarget (§13).

Assignment mode is one of:

| Mode | Who may create the MissionAssignment |
|------|--------------------------------------|
| `fan-accept` | The Fan Actor, by accepting that available mission. |
| `policy-assign` | Campaign policy, by an explicit assignment command to one Fan Actor. |

A mission declares one mode. Creation happens only through the domain command for that mode. The same Fan Actor and the same Mission have at most one MissionAssignment. Fan acceptance and policy assignment are not two authorities on the same mission. The Artist Actor does not add a second creation path. Product UX of the command stays outside this CDR.

**MissionAssignment** (aggregate):

```text
pending → active → evidence-submitted → verified | rejected → closed
```

- The Fan Actor submits Evidence while the assignment is `active`.
- Verification records an outcome. It does not authorize a reward and does not create Revenue.

A MissionAssignment authorizes **at most one** RewardEntitlement (I-20). Partial redemption draws down that entitlement. It does not open a second one.

---

## 10. Evidence and Verification

**Evidence** is an append-only entity on the assignment: submitter ActorRef (the fan), timestamp, and an integrity reference (content hash plus locator). The bytes live behind a storage port. Replacing a file in storage does not rewrite an evidence record. A new submission is a new evidence id. Verification cites one evidence id.

**Verification** is a record: assignment id, evidence id, outcome `accepted` | `rejected`, verifier (ActorRef or policy id), timestamp. For one MissionAssignment, at most one `accepted` Verification is **current**. A `rejected` Verification cannot authorize a reward. Acceptance is an input to authorization, not the authorization itself. Who verifies (human, automated, vendor, quorum, oracle, or social API) is policy or a later ADR. This CDR does not choose it.

```text
mission completion ≠ verification ≠ reward authorization ≠ consumption
```

**Reward authorization** succeeds only when the domain establishes all of the following together, or none of them:

1. The current Verification for the assignment is `accepted`, and the command cites that Verification id.
2. The MissionAssignment has no RewardEntitlement yet.
3. The authorized amount is `> 0`, uses the same asset and scale as the Mission `maximumReward`, and is `≤ maximumReward`.
4. The Campaign is `active`, and after this grant `standing ≤ committed` for that asset and scale.
5. Exactly one RewardEntitlement is created, citing that Verification.
6. Campaign `standing` includes that authorization.

Once a RewardEntitlement exists, the Verification id it cites is immutable for that authorization. A later verification record does not retarget it. The verifier does not become the authorizing authority by writing `accepted`. This CDR does not specify the persistence mechanism of the all-or-nothing success.

---

## 11. RewardEntitlement

RewardEntitlement belongs to Fan Economy.

It is the authorized purchasing power of one Fan Actor, backed by a named campaign reserve, created by the authorization command after an accepted Verification.

It is not a royalty, not an EconomicEntitlement, not a token, and not freely transferable. It is not settled to the fan. No SettlementIntent is opened for the fan because a reward exists.

| Field (semantic) | Rule |
|------------------|------|
| Holder | Fan ActorRef. Binding revocation does not move the holder (§22). |
| Amount authorized | Money `{ units, scale, asset }`. Fixed at authorization. |
| Amount consumed | Money, same asset and scale. Starts at zero. Increases only inside a successful Redemption (§13). |
| Amount released | Money, same asset and scale. Starts at zero. Increases only by reward release of unconsumed remaining (§8). |
| Remaining | `authorized − consumed − released`. Never negative. |
| Provenance | Campaign, reserve, MissionAssignment, and the current accepted Verification cited at authorization |
| Redeemable | `remaining > 0` and the entitlement is not reversed under §14. `remaining = 0` means nothing left to redeem. |

Partial consumption is canonical. Example: authorized 5 units, redemption of 2, remaining 3, in the entitlement's own minor units. The MVP may show only "redeem all remaining" in a UI. The domain still accepts an amount `0 < amount ≤ remaining`.

Consumption is not reward release and is not reversal. There is no token balance beside these amounts. `redemptionId` makes one redemption idempotent. It does not, by itself, serialize two different redemption ids against the same remaining (I-28).

Under concurrent commands, `consumed + released ≤ authorized` stays true. Example: authorized = 5 and remaining = 5; concurrent redeems of 3 and 3; at most one succeeds; `consumed` never becomes 6. This CDR does not choose optimistic locking, row locks, version columns, or chain serialization.

---

## 12. PurchasingPower

PurchasingPower is the derived sum of `remaining` across a Fan Actor's RewardEntitlements that share the same Money asset and scale and are still redeemable (§11). Reversed entitlements contribute nothing.

```text
PurchasingPower(actor, asset, scale) = SUM(remaining)
```

- It is not persisted as its own balance, row, aggregate, or token.
- It cannot diverge from the entitlements, because it is not stored apart from them.
- It uses existing Money semantics. It is not a float and not an implicit dollar.
- It is not a blockchain asset.
- It is not `availableToAuthorize`. That figure is campaign capacity. This figure is the fan's unconsumed reward.
- The fan cannot withdraw it and cannot transfer it to another Actor.

A surface may display "$1 available to support music" as a reading of that projection. The sentence describes support capacity. It does not mean the fan owns a freely transferable 1-unit token.

Mixed assets are not blended. Each asset/scale pair is its own projection.

---

## 13. Redemption

Redemption is the **only** canonical bridge from Fan Economy into the economic kernel.

```text
RewardEntitlement
  → PurchasingPower          (derived)
  → Redemption
  → Revenue
  → Distribution
  → EconomicEntitlement
  → SettlementIntent
  → EconomicSettlement
```

No other fan-economy command creates Revenue. No fan-economy command pays an artist by a side rail.

**RedemptionTarget** is a value object `{ kind, id }`.

| Kind | Protocol stance |
|------|-----------------|
| `release` | **Enabled.** Initial MVP and pilot target. Means a musical Release. Distribution is snapshotted from that Release's Participation at redemption success (§14). |
| `work` | Named for later use. **Not enabled.** No DistributionRule is defined for a Work target in this CDR. |
| `artist` | Named for later use. **Not enabled.** No DistributionRule is defined for an artist-level target in this CDR. |

A redemption whose target kind is not enabled is rejected. It does not create Revenue and does not consume.

The catalog object on the Mission does **not** restrict the RedemptionTarget. For MVP the fan may redeem toward any musical Release that is distributable at that moment (§14). Work and Artist targets stay disabled.

**Success condition.** A successful Redemption exists if and only if the domain has established all three facts consistently:

```text
successful Redemption
  ⇔ reward consumption recorded
  ⇔ immutable Redemption record
  ⇔ exactly one Revenue whose origin identifies that Redemption
```

No successful state contains consumption without that Revenue, or that Revenue without the matching consumption. A command that cannot establish the whole triple — including a musical Release the kernel will not distribute (§14) — fails with no consumption and no Revenue. How that success is made atomic (SQL transaction, outbox, saga, or otherwise) is an implementation ADR, not this CDR.

**Immutable success record.** Immutable means the original identity, payload, amount, target, and the relationship to the resulting Revenue cannot be rewritten. That does not stop the aggregate from later entering the canonical `reversed` state through the reversal transition in §14. Reversal does not edit those original facts. It records the reversal beside them.

The command, when it succeeds:

1. Caller is the Fan Actor who holds the RewardEntitlement, under a valid binding/session (§22).
2. `redemptionId` is the idempotency key of this redemption, not of the entitlement's remaining.
3. Amount is Money, same asset and scale, `0 < amount ≤ remaining`.
4. Target is enabled (MVP: a musical Release that is distributable at this moment).
5. `remaining` moves to `consumed` by that amount. `availableToAuthorize` does not increase.
6. The Revenue gross equals the redeemed amount. Its origin kind names the redemption and points at `redemptionId`. It is not `sale` and not `other`.
7. That Revenue is assessed under §15 and distributed by the existing kernel, snapshot included.

Retry of the same `redemptionId` with the same payload returns that established result. It does not consume again and does not record a second Revenue. The same id with a different payload conflicts and mutates nothing.

Over-redemption, a zero or negative amount, a different asset or scale, and a second consumption of the same units are rejected. Concurrent redeems of different ids against one entitlement stay within `consumed + released ≤ authorized` (I-28).

The fan's redemption does not set a payout wallet for the fan. Later settlement of the resulting EconomicEntitlements uses the beneficiary Actor's wallet capability, as the kernel already does.

---

## 14. Integration with the Existing Economic Kernel

Artist payment continues to mean: Revenue exists, a versioned fee policy assesses it, Distribution allocates the net to beneficiary Actors, EconomicEntitlements accrue, and only those entitlements may be settled.

Redemption-origin Revenue is still Revenue. It is distributed **once** (same kernel rule as any revenue). EconomicEntitlement, SettlementIntent, and EconomicSettlement keep their current meanings. This CDR does not add fields that put chain identity onto them.

Semantic gaps this CDR closes in meaning, without implementing types:

| Gap | Canonical rule |
|-----|----------------|
| Origin | Redemption Revenue carries an origin that points at `redemptionId`. `sale` remains a commercial sale. `other` is not the name of a redemption. |
| Distribution | At redemption success, MVP target `release` snapshots the DistributionRule from that musical Release's Participation as of that moment. Work and Artist targets stay disabled until a later CDR defines their rule. |
| Who is paid | Beneficiaries of that snapshot. The fan is not paid because they redeemed. |
| Settlement subject | `SettlementIntent` references only an EconomicEntitlement of this kernel. It never references a RewardEntitlement (§18, I-26). |
| Second engine | Forbidden. There is no fan-reward settlement path that credits an artist outside this chain. |

**Distribution snapshot.** The kernel accepts a Participation-derived rule only when participants resolve to ActorRefs and shares satisfy the kernel (today: sum to 10_000 bps, no unbound participant, no wallet-as-beneficiary). If the musical Release is not distributable at the redemption boundary, the redemption command fails with no consumption and no Revenue.

After that Revenue exists, later Participation edits do not rewrite its Distribution or its EconomicEntitlements. Rights stay off this path. Participation ≠ Rights.

**Settlement type safety.** RewardEntitlement is never an input to SettlementIntent, EconomicSettlement, the Base settlement adapter, or MOCSettlement. The only bridge is:

```text
RewardEntitlement → Redemption → Revenue → Distribution
  → EconomicEntitlement → SettlementIntent → EconomicSettlement
```

**Failure, retry, reversal, compensation.** These are not synonyms (§5).

```text
Redemption  ≠  Revenue  ≠  EconomicEntitlement  ≠  Settlement
```

If the redemption triple is not established, there is no successful redemption. A crash between steps is not a half-consumed reward and not a Revenue without consumption. Retry of the same id and payload either returns the established triple or leaves no partial success.

If the triple succeeded and artist settlement later fails, stays `UNKNOWN`, or never confirms:

- That outcome is reconciliation of execution, not reversal.
- Fan PurchasingPower is **not** restored.
- `consumed` stays consumed. `availableToAuthorize` does not increase.
- The Revenue stays recorded.
- The EconomicEntitlement stays unconfirmed (`accrued` or the kernel's non-settled state). Failed execution does not settle it twice and does not delete it.

A settlement failure is not a redemption reversal and is not a reward release.

**Reward release** moves only unconsumed `remaining` to `released`. It creates no Revenue and does not change an existing Revenue. It does not decrease `consumed`.

**Reversal** of already consumed value is not a reward release and is not a kernel-only reverse. `X` is the **complete** amount of that one Redemption. A Redemption is not partially reversed. There is no partial-reversal semantic. Success means all of the following, or none:

1. `consumed` decreases by `X`.
2. `remaining` increases by `X` on the **same** RewardEntitlement. PurchasingPower of that entitlement returns by `X`.
3. `released` does not change.
4. `standing` does not change. `availableToAuthorize` does not increase. The unit is not released, does not disappear, and cannot be authorized again while it sits in `remaining`.
5. That Redemption is marked reversed.
6. The Revenue created by that Redemption is invalidated.
7. Every EconomicEntitlement produced only by that Revenue and still reversible is invalidated in the same success.

```text
consumed + released + remaining = authorized
```

stays true. The fan does not edit Revenue or EconomicEntitlement records. Domain policy checks reversibility and applies this transition (§16).

A redemption-origin Revenue must not be reversed by the economic kernel on its own. Kernel reversal of that Revenue is legal only inside this operation. Otherwise the Revenue could die while `consumed` stays consumed.

If any artistic value from that Redemption has already reached a state the kernel treats as irreversibly settled, this simple reversal is forbidden. Compensation after that settlement is outside this MVP and is not designed here.

---

## 15. Fee Policy Boundary

Revenue created by Redemption is subject to a **versioned FeePolicy** (policy id + version recorded on the Revenue).

Accounting shape, independent of any rate:

```text
Revenue.gross = Redemption.amount
```

The committed reserve is not Revenue. Committing funds does not recognize income. The fan does not add a second payment on top of the redeemed amount. Any fee on this origin **partitions** that gross. It must not create a buyer charge above it:

```text
buyerPays ≤ Redemption.amount
```

on the Fan Economy redemption path. No convenience or buyer fee is added above redeemed purchasing power. Protocol fee, if a future policy version charges one, is a slice of the same gross, not a second draw on the reserve.

This CDR does **not** set a percentage. It does not canonize 500 bps, 0 bps, or any other rate. Artist-funded, protocol-funded, and ordinary purchase flows may later select different policy versions. That selection is policy data. It does not fork Fan Economy and does not create a second distribution engine.

A future ADR may bind a concrete policy version. Until then, implementers must not hard-code a redemption rate into the protocol.

---

## 16. Authority Model

Economic authority is a domain command plus the invariants in §18. Interfaces are not authority.

| Actor / policy | Authority |
|----------------|-----------|
| Artist Actor | Opens and controls the Campaign. Commits **artist** reserve lines according to policy. Does not commit protocol lines. |
| Protocol treasury authority | Commits **protocol** reserve lines. Not held by the artist, the fan, or the verifier. |
| Fan Actor | Creates a MissionAssignment only in `fan-accept` mode. Submits evidence. Owns the RewardEntitlement. Chooses redemption amount and an enabled target. May voluntarily release some or all of that entitlement's `remaining` (`remaining → released`). May request reversal of their own Redemption only while its downstream economic state is still reversible. Does not commit reserve. Does not post Revenue except by a successful redemption. Does not directly mutate Revenue or EconomicEntitlement. |
| Campaign policy | Creates a MissionAssignment only in `policy-assign` mode, one Actor per mission. Does not add a second path on a `fan-accept` mission. |
| Verifier | Writes Verification only. No reserve authority. No Revenue authority. No release authority. No reversal authority. |
| Domain authorization predicate | The all-or-nothing grant in §10, including `amount ≤ Mission.maximumReward` on the same asset and scale. The verifier's `accepted` is an input, not a second grant. |
| Domain reversal policy | Validates a fan's reversal request and applies the all-or-nothing transition in §14. The fan does not write the kernel records. |

**Reward release (MVP).** Only the Fan Actor who owns the RewardEntitlement may release some or all of its `remaining`. That is voluntary relinquishment of unused purchasing power. It increases `availableToAuthorize` by the same amount. The Artist Actor must not claw back an already authorized reward because they control the Campaign. The verifier, Studio, an agent, an external platform, a wallet, and a blockchain executor have no release authority. Campaign expiration does not release value in this CDR. A later expiry policy would be a separate command. It is not selected here and it is not a silent clawback.

**Redemption reversal (MVP).** The Fan Actor may request reversal only of their own Redemption, and only while the downstream state is still reversible. Domain policy performs the transition in §14. The fan does not directly mutate Revenue or EconomicEntitlement. The Artist Actor must not reverse a fan redemption because they own the target Release. The verifier, Studio, an agent, an external platform, a wallet, and a blockchain executor have no independent reversal authority. Protocol dispute or admin reversal is outside this MVP and is not defined here.

**Not economic authority:** Studio, web UI, AI agent, WhatsApp, Telegram, Exponential, or an external social platform. They may submit intents to commands. They cannot commit reserve, release remaining, reverse a redemption, mint a reward, invent purchasing power, post Revenue directly, change Distribution, or settle another Actor's entitlement. A wallet and a blockchain executor cannot do those things either.

Client-supplied actor identifiers do not authorize. The caller is the Actor of a verified session (authentication → C-BIND binding → session), consistent with the current session boundary. This CDR does not redesign that session mechanism.

---

## 17. Trust Model

Protocol trust here means: a party cannot invent purchasing power, authorize beyond the committed reserve, consume the same reward units twice, or pay artists on a path that skips Revenue and Distribution.

Those are the facts whose unilateral change would damage trust between the funder, the fan who already earned a reward, and the beneficiaries of the work.

Presentation copy, mission prose, social metadata, evidence files, analytics, and notifications can be wrong or edited without rewriting those obligations, as long as the domain records (reserve, authorization, verification citation, redemption, revenue) stay intact.

---

## 18. Protocol Invariants

Inherited canon is restated so Fan Economy cannot drift from it. New invariants are marked.

| ID | Statement | Standing |
|----|-----------|----------|
| I-01 | Actor ≠ Wallet. | Already canonical. Inherited. |
| I-02 | Reward ≠ token. RewardEntitlement and PurchasingPower are not tokens, NFTs, or transferable assets. | New. Extends Rights ≠ token. |
| I-03 | Mission completion ≠ reward authorization. | New. |
| I-04 | Interface ≠ economic authority. Studio, UI, agents, and external platforms do not authorize rewards, reserves, or Revenue. | Refine of the existing "UI is not source of truth" rule, now explicit for agents and third parties. |
| I-05 | Domain ≠ Execution ≠ Blockchain. | Already canonical. Inherited. Applies to Campaign, Mission, Reward, and Redemption. |
| I-06 | Fan Economy ≠ artist royalty economy. The only cross-context fact is Redemption → one Revenue, which then uses the existing kernel. | New. |
| I-07 | RewardEntitlement ≠ EconomicEntitlement. | New. Different holder purpose, origin, store, and exit. |
| I-08 | A fan is an Actor. There is no FanAccount in this protocol. | New, on top of ADR-011 and C-BIND. |
| I-09 | A redemption is idempotent on `redemptionId` **plus payload**. Same id and same payload return the established triple (consumption, redemption record, one Revenue) and do not apply it again. Same id and a different payload conflict and do not mutate. `redemptionId` does not serialize a different id against the same remaining. | Refined. |
| I-10 | For one asset and scale, `standing = SUM(consumed + remaining) = SUM(authorized − released)` and `standing ≤ committed`. `availableToAuthorize = committed − standing`. Do not subtract `consumed` twice. | Refined. |
| I-11 | PurchasingPower is non-transferable and non-withdrawable. | New. |
| I-12 | Verification ≠ authorization ≠ consumption. | New. |
| I-13 | Campaign, Mission, MissionAssignment, Evidence (domain record), Verification, RewardEntitlement, and Redemption contain no wallet, chain id, contract address, or token id. | New. Applies I-05 to this context. |
| I-14 | Redemption Revenue is distributed at most once. | Inherits the kernel rule; scoped to this origin. |
| I-15 | After a successful redemption triple, settlement failure or UNKNOWN does not restore purchasing power, does not decrease `consumed`, and does not increase `availableToAuthorize`. That outcome is reconciliation, not reversal. | Refined. |
| I-16 | The verifier is not Revenue authority. | New. |
| I-17 | For each RewardEntitlement, `consumed + released + remaining = authorized`, and each term is ≥ 0. Sum of successful redemption amounts against that entitlement equals `consumed`. | Refined. |
| I-18 | A Redemption has exactly one RedemptionTarget. This CDR enables only `kind = release`. | New. Keeps future targets nameable without an undefined distribution. |
| I-19 | A successful Redemption exists if and only if consumption, the immutable redemption record, and exactly one Revenue identifying that redemption are all established. That Revenue's gross equals the redeemed amount. Immutable means identity, payload, amount, target, and the Revenue relationship are not rewritten. A later `reversed` state (§14) does not rewrite them. | Refined. |
| I-20 | A MissionAssignment authorizes at most one RewardEntitlement. | New. Stops double minting from one verified attempt. Partial redemption is consumption, not a second grant. |
| I-21 | Reward authorization is all-or-nothing across current accepted Verification, assignment capacity, `amount ≤ Mission.maximumReward` on the same asset and scale, `standing ≤ committed`, and creation of exactly one RewardEntitlement. | Refined. |
| I-22 | Redemption (`remaining → consumed`) does not increase `availableToAuthorize`. | New. |
| I-23 | Successful Redemption ⇔ recorded consumption ⇔ immutable redemption record ⇔ exactly one matching Revenue. No consumption without that Revenue, and no such Revenue without the consumption. | New. Restates the success condition beside I-19 so neither half-state is readable as success. |
| I-24 | Distribution is snapshotted when redemption-origin Revenue is established, from Participation valid then. A musical Release the kernel will not distribute causes no consumption and no Revenue. Later Participation edits do not rewrite that snapshot or its EconomicEntitlements. | New. |
| I-25 | Redemption fees partition `Revenue.gross`. They cannot create a buyer charge above `Redemption.amount`. The reserve commitment itself is not Revenue. | New. |
| I-26 | SettlementIntent, EconomicSettlement, and settlement adapters accept only an EconomicEntitlement id from the kernel. They reject a RewardEntitlement id. | New. |
| I-27 | A decrease of `consumed` by `X` is a reversal of that whole Redemption. `X` is its complete amount. A Redemption is not partially reversed. In the same success, `remaining` increases by `X`, `released` is unchanged, that Revenue is invalidated, and every EconomicEntitlement that came only from that Revenue and is still reversible is invalidated. If any of that artistic value is already irreversibly settled, the decrease is forbidden. Reward release does not decrease `consumed`. Compensation after irreversible settlement is outside this CDR. | Refined. Downstream pairing. Conservation of standing is I-30. |
| I-28 | Consumption of one RewardEntitlement is serializable with respect to its remaining. Concurrent commands keep `consumed + released ≤ authorized`. | New. |
| I-29 | At most one accepted Verification is current for a MissionAssignment. Reward authorization references that Verification, and the reference is immutable once the RewardEntitlement exists. | New. |
| I-30 | Reversal of amount `X`, the complete amount of that Redemption, moves that amount from `consumed` to `remaining` on the same RewardEntitlement. `released`, `standing`, and `availableToAuthorize` do not change. The unit is not released, does not vanish, and is not available to authorize again. | New. Reserve consequence of I-27. |
| I-31 | Reward release authority is only the owning Fan Actor. Reversal authority is that fan's request plus domain policy while downstream value is still reversible. Verifier, Studio, agent, external platform, wallet, blockchain executor, and the Artist Actor (as campaign or Release owner) do not hold those authorities. | New. |
| I-32 | Reward authorization amount is `≤ Mission.maximumReward` and uses that Money asset and scale. | New. |
| I-33 | A Revenue whose origin is a Redemption is not reversed by the kernel alone. Kernel reversal of that Revenue is legal only inside the canonical Redemption reversal. | New. |
| I-34 | This CDR defines no decrease of `committed`. Any later decrease must keep `committed ≥ standing`. | New. |

---

## 19. On-chain / Off-chain Principle

A fact **should** be enforced on-chain only when unilateral manipulation of that fact would materially damage protocol trust.

Candidates, not implementations:

| Fact | Why it is a candidate |
|------|------------------------|
| Committed campaign reserve | A funder or operator could otherwise inflate or erase the commitment fans rely on. |
| Authorization against that reserve | Otherwise rewards can be minted without backing. |
| Consumption of authorized reward | Otherwise the same purchasing power can be redeemed twice. |
| Anti-replay of that consumption | Otherwise a repeated key can pay twice. |

Off-chain by this criterion: campaign presentation, mission text, social metadata, evidence files, analytics, recommendations, notifications, and the fan-facing reading of PurchasingPower.

EconomicEntitlement and SettlementIntent remain domain facts, as they are today. On-chain settlement evidence of the **artist** side stays on the existing execution path when a redemption Revenue is later settled. That evidence is not a fan token and not a campaign identity.

This CDR does **not** choose the chain, the contract, or whether a given pilot uses a trusted operator instead of on-chain enforcement. The invariants hold either way. Moving enforcement on-chain is an ADR.

---

## 20. Blockchain Independence

```text
MOC Fan Economy domain
        |
      Ports
        |
 replaceable infrastructure adapters
```

Stellar, Soroban, and Base are not part of Actor, Campaign, Mission, RewardEntitlement, PurchasingPower, or Redemption.

Base remains the currently accepted **settlement** rail for EconomicSettlement that already exists ([ADR-005](../backend-architecture/adr/ADR-005-base-usdc-settlement.md), MOCSettlement V1). That acceptance does not make Base the identity of fan rewards and does not make MOCSettlement the reward reserve.

Soroban **may** later implement reserve commitment or consumption behind a port. That choice is an ADR. It is not made here. It must not redefine these aggregates.

---

## 21. Execution Boundary / Deferred Decisions

CDR-009 defines **what must remain true**. An ADR defines **how** a chosen implementation satisfies it. ADRs must not silently change §18 or the frozen aggregates. No ADR number is assigned here. The repository does not make the next ADR id unambiguous for these topics, so they stay unnumbered until an ADR is actually written.

Next ADR topics, not created:

| Topic | What it may decide | What it must not decide |
|-------|--------------------|-------------------------|
| A. Fan Economy persistence and transactional consistency | How the redemption triple and the authorization predicate commit together | A second revenue path or a stored PurchasingPower balance |
| B. Campaign reserve custody / treasury adapter | Where committed value is held | Campaign, reward, or redemption identity |
| C. Evidence verification infrastructure | Human, automated, or vendor review | That the verifier authorizes Revenue |
| D. Reward authorization and anti-abuse policy | Sybil, self-reward, social-action uniqueness | Standing, `maximumReward`, or I-20 |
| E. Redemption → economic kernel integration | Origin kind and FeePolicy version wiring | A buyer charge above the redeemed amount, or a second settlement engine |
| F. On-chain anchoring / anti-replay | Only if unilateral manipulation would damage trust (§19) | Putting chain identity on Fan Economy aggregates |
| G. Soroban or Stellar adapter | Only if later justified, behind a port | Domain identity |
| H. Cross-chain or bridge architecture | Only if later justified | A domain requirement for a bridge |

Concrete fee rates stay in a FeePolicy version, not in this CDR. Introducing a second chain beside Base settlement still requires an ADR. ADR-005 already says multi-chain settlement is not in horizon without one. This CDR does not open that horizon. Base remains the accepted settlement rail of the existing kernel. It is not part of the Fan Economy domain.

---

## 22. Identity and C-BIND

C-BIND/1 release 1.0.0 (CDR-008) is consumed, not modified. `docs/C-BIND.md` stays where it is.

```text
Privy (or a later issuer) = authentication
C-BIND/1                 = binding
ActorRef                 = fan, artist, verifier, and beneficiary
```

Wallet attach, replace, or revoke does not change ActorRef and does not transfer a RewardEntitlement. A fan may hold a reward with zero wallets. Redemption does not require the fan to understand or operate a wallet.

Revocation or absence of a valid authentication binding does **not** delete, transfer, or reassign a RewardEntitlement, and does not move PurchasingPower off that ActorRef. It does not assign the reward to a wallet. Commands that need that Actor's authority are unavailable until C-BIND allows a valid binding and session for that Actor. A `REVOCADO` AuthSubject does not become `VIGENTE` again by retry. This CDR does not change C-BIND.

No new identity type is introduced. Social accounts may appear only as evidence sources or verification subjects. They are not ActorRef.

---

## 23. Security Principles

- Authorization is the all-or-nothing predicate in §10 (I-21), checked against the current accepted Verification (I-29), the assignment cap (I-20), and reserve standing (I-10).
- Evidence bytes are not themselves a grant.
- `redemptionId` replay is safe for that payload (I-09). A different redemption id still cannot overspend the same remaining (I-28).
- `consumed + released + remaining = authorized` (I-17). Decreasing `consumed` without restoring `remaining` and without invalidating that Revenue is forbidden (I-27, I-30, I-33).
- Only the owning fan releases `remaining` (I-31). That is the only movement here that increases `availableToAuthorize`. Authorization cannot exceed `maximumReward` (I-32). `committed` does not decrease in this CDR (I-34).
- The fan is not a settlement beneficiary of their own reward (I-07, I-11, I-26).
- Reserve custody, when implemented, is an adapter with its own threat model. This CDR does not weaken MOCSettlement V1 by storing campaign budgets in it.
- Agents and webhooks are untrusted callers (§16, §26).

---

## 24. Privacy Principles

- Evidence files stay off the economic kernel and off any settlement instruction.
- Verification stores the decision and the evidence id, not a public copy of the social platform profile.
- ActorRef stays an opaque reference. AuthSubject and wallet are not copied onto Campaign, RewardEntitlement, or Redemption.
- On-chain candidates in §19, if an ADR later anchors them, anchor amounts, commitment ids, and replay keys — not mission text, not evidence files, not a fan's login identity.
- Purchasing-power display is a projection for the holder, not a public transferable balance.

---

## 25. UX Principles

Canonical fan path:

```text
Discover → Participate → Contribute → Verify → Earn → Support / Buy
```

"Participate" is a MissionAssignment. "Earn" is a RewardEntitlement. "Support / Buy" is a Redemption whose MVP target is a Release.

Infrastructure stays out of the fan's required understanding: wallets, gas, networks, bridges, smart contracts, Soroban, EVM. A later capability may add an explicit step only when the trust model truly demands it.

Allowed display: "$1 available to support music", as a reading of PurchasingPower.

Forbidden implication: the fan owns a freely transferable token of that amount.

---

## 26. External Interfaces / Agents

**Decision: an agent is not required.**

The protocol is complete, as semantics, with domain commands and a human fan and artist. No Exponential, WhatsApp, Telegram, or other agent is part of the canon.

A future agent is an application adapter: a replaceable caller of the same commands Studio or the web UI would call.

It has no authority to mint rewards, create unbacked purchasing power, create Revenue directly, alter Distribution, or settle another Actor's entitlement.

---

## 27. MVP / Pilot Boundary

Enabled for a first implementation that conforms to version 1.0.0. Acceptance does not implement the product:

- Campaign, Mission, MissionAssignment, Evidence reference, Verification
- One RewardEntitlement per verified assignment, partial-consumption semantics in the domain
- PurchasingPower as a derived reading
- RedemptionTarget **only** `release`
- Redemption → one Revenue → Participation snapshot at that moment → existing settlement path
- Versioned FeePolicy that only partitions gross, with **no** rate fixed here
- Product UI **may** offer only full redemption of remaining value; the domain must still allow a smaller amount

Illustrative pilot shape, with no extra architecture: an Artist Actor (for example Cleaver) opens one campaign and one mission; a Fan Actor receives a MissionAssignment under the mission's single assignment mode; evidence and one current accepted Verification lead to one RewardEntitlement; derived purchasing power is redeemed toward one musical Release (for example Vengeance) that the kernel can distribute; one Revenue is snapshotted onto that Release's Participation; EconomicEntitlements enter the settlement pipeline that already exists. That path does not require Soroban, Stellar, a new token, a bridge, an agent, an NFT, a new identity, a new royalty engine, or a new settlement engine. It does require the Release to be distributable at redemption time (bound Actor participants, kernel share rule).

Not in the MVP, even after acceptance:

- Work or Artist redemption targets
- Token, MOC Credit, fan withdrawal, fan-to-fan transfer
- Reward vault, Soroban adapter, cross-chain treasury
- Automatic restore of purchasing power when artist settlement fails
- Decreasing `consumed` while the redemption Revenue stays alive
- Compensation after artist settlement has already completed
- A second artist payment engine
- Treating this decision as a rewrite of the already completed band pilot

The completed band pilot remains a catalog and kernel pilot. It does not implement this CDR.

---

## 28. Rejected Alternatives

| Alternative | Why rejected |
|-------------|--------------|
| Merge RewardEntitlement into EconomicEntitlement | Different lifecycle. The kernel claim is settled to a royalty beneficiary. The fan claim is consumed by redemption. |
| FanAccount as the holder | Splits identity from Actor and from C-BIND. |
| MOC Credit or fan token | Makes purchasing power a transferable asset and breaks I-02 and I-11. |
| Withdrawable fan balance | Second exit that never becomes artist Revenue. |
| All-or-nothing consumption as a domain rule | Blocks partial redemption. UI may still redeem the full remainder. |
| Campaign as a smart contract, including the historical per-campaign crowdfunding contract | Puts chain identity in the aggregate and confuses owner-address with Artist Actor. |
| MOCSettlement V1 as the reward vault | That contract is a settlement executor path, not a campaign reserve. |
| Automatic purchasing-power restore on settlement failure | Confuses execution failure with reversal and can double-spend the reward if settlement later confirms. |
| Base or Soroban as the definition of reward or redemption | Breaks blockchain independence. |
| Agent, chat platform, or external social network as the source of rewards or revenue | Breaks I-04 and I-16. |
| Calling mission attempts Participation | Collides with creative participation and revenue share. |
| Using `Revenue.origin = other` as the redemption bridge | Hides the only legal ingress. The origin must name the redemption. |
| A second distribution/settlement stack for "fan-funded" artist income | Breaks the single kernel. |
| Subtracting `consumed` again from `availableToAuthorize` | Double-counts value that `standing` already includes. |
| Persisting PurchasingPower as its own balance | Creates a second ledger that can diverge from RewardEntitlement.remaining. |
| Two authorities creating the same Actor/Mission assignment | Duplicate attempts. One mission has one assignment mode. |
| Artist clawback of an authorized reward | Release is the owning fan's voluntary relinquishment. Campaign control is not release authority. |
| Kernel reverse of a redemption Revenue by itself | Leaves `consumed` in place while the Revenue dies. I-33 forbids that bypass. |

---

## 29. Consequences

- Implementers, after acceptance, add Fan Economy aggregates and a redemption origin **beside** the kernel, then call the existing assess / distribute / entitle / settle path. They do not fork payout.
- Fee rates for that origin are a policy version, reviewed outside this text.
- Reserve custody and any on-chain anti-replay are ADRs. Shipping them inside domain types would violate I-13.
- Historical documents that still say the economic store is memory-only, that settlement was not started, or that FanAccount is the fan identity, stay historical (§31). They do not override this CDR or the implemented kernel.
- Product, schema, and contract work may now cite version 1.0.0 as the approved domain contract. That citation does not authorize a chain, a vault, an agent, or a fee rate.

---

## 30. Open Questions

These stay open. None of them weakens an accepted invariant.

| Question | Class |
|----------|--------|
| Who verifies in the first pilot (artist Actor, protocol policy, or both), given that neither creates Revenue or commits the other's reserve line | Implementation policy |
| Sybil limits, artist self-reward, and uniqueness of a social action across fans | Implementation policy (ADR topic D). Not new protocol objects |
| Whether the fan role is stored on Actor, or is only the fact of an assignment or a reward | Implementation policy |
| Which FeePolicy version applies to artist-funded versus protocol-funded redemption. Rates stay out. I-25 stays in force | Implementation policy (ADR topic E) |
| Trusted operator versus on-chain anchoring of the reserve. The trust criterion is §19 | Implementation policy (ADR topics B and F) |
| A later expiry command for unconsumed authorization. Silent expiry is not canon and is not a clawback. The only release in 1.0.0 is the owning fan's voluntary release | Future canonical evolution |
| DistributionRule for Work or Artist targets, if a later CDR enables them. Both kinds stay disabled | Future canonical evolution |
| Compensation after irreversible artistic settlement. Not in this version | Future canonical evolution |

---

## 31. Related Canon

Normative for **identity and the economic kernel this CDR extends** (do not redefine them here):

- [C-BIND/1 consumption](../C-BIND.md) — CDR-008, Actor ≠ wallet
- [Web3 Trust-Native domain convergence](../MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) — Work, Release, Track, Participation, wallet as capability
- [Economic & Rights Foundation](../MOC-ECONOMIC-RIGHTS-FOUNDATION.md) — Revenue, Distribution, EconomicEntitlement, Settlement, Participation ≠ Rights
- [On-chain execution boundary](../MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) — Intent, adapter, receipt
- [Base settlement contract](../MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) — what MOCSettlement V1 is, and that it is not a treasury
- [ADR-011](../backend-architecture/adr/ADR-011-identity-tenancy.md) — Actor, roles including fan, wallet not login
- [ADR-005](../backend-architecture/adr/ADR-005-base-usdc-settlement.md) — current settlement rail only

**Historical documentation.** Some older documents describe earlier implementation stages or pre-reconstruction models (in-memory ledger, settlement "not started", `FanAccount` as an aggregate, crowdfunding as a per-campaign contract, July 2026 bounded-context maps). They are not rewritten in this phase. Where they disagree with the implemented kernel (Prisma-backed economics, verified Actor session, Base settlement adapter, single Actor identity), they are **not normative** over that kernel and not normative over this CDR. This includes stage notes inside the foundation and convergence documents, the final end-to-end validation snapshot, data-model `FanAccount` pages, and `docs/crowdfunding-contract-base.md`.

---

## 32. Decision Summary

1. **ACCEPTED** as canonical version **1.0.0** on **2026-09-23**. Incompatible semantic change requires a new CDR or explicit supersession. ADRs implement. They do not rewrite.
2. Fan Economy is a new context on the existing Actor. No FanAccount, no fan token, no MOC Credit token, no wallet identity, no campaign-as-contract.
3. Aggregates: Campaign, MissionAssignment, RewardEntitlement, Redemption. Mission and Evidence are entities. Verification is a record. PurchasingPower is derived. RedemptionTarget is a value object.
4. RewardEntitlement ≠ EconomicEntitlement. The fan reward is reserve-backed purchasing power, not a royalty and not settled to the fan.
5. Partial redemption is canonical. Remaining value cannot be negative. MVP UI may still redeem the full remainder.
6. Reserve state lives in Campaign. `standing ≤ committed`. Redemption does not free authorization capacity. Reward release frees only unconsumed remaining. Custody is not chosen. MOCSettlement V1 is not the vault.
7. A successful Redemption is the triple: consumption, immutable redemption record, and exactly one Revenue. That is the only bridge into the kernel. Distribution is snapshotted then. MVP target is a musical Release. SettlementIntent accepts only an EconomicEntitlement.
8. Redemption Revenue uses a versioned FeePolicy that partitions gross and cannot charge the fan above the redeemed amount. No percentage is canon in this CDR.
9. Settlement failure does not restore purchasing power. A reversal restores the complete amount of that Redemption to `remaining`, leaves `standing` unchanged, and invalidates that Revenue in the same success. The original redemption facts stay unrewritten. The owning fan requests it. Domain policy applies it. Settled artistic value is not reversed here. Compensation is out of scope. Only the fan voluntarily releases unused remaining.
10. Interfaces and agents are not economic authority. An agent is not required.
11. On-chain enforcement follows the trust criterion and is deferred to ADRs, as are Soroban, the reward vault, treasury custody, and cross-chain reconciliation.
12. C-BIND/1 and `docs/C-BIND.md` stay unchanged.

### Deferred ADR topics (not created, not numbered)

See §21. Persistence and transactional consistency. Reserve custody. Verification infrastructure. Anti-abuse policy. Redemption-to-kernel integration, including a concrete FeePolicy version. On-chain anchoring only if justified. Soroban or Stellar only if justified. Cross-chain or bridge only if justified.
