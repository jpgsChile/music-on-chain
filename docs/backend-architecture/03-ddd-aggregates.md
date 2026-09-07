# 03 — DDD Aggregates

| Field | Value |
|-------|-------|
| **Purpose** | System-level aggregate view. Canonical deep dive: Data Model Step 1 aggregates. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model Aggregates](../data-model/01-aggregates.md) |

<!-- doc-id: backend-architecture/03-ddd-aggregates.md -->

> **Canonical deep dive:** [data-model/01-aggregates.md](../data-model/01-aggregates.md).  
> This page is the **architecture summary**; update the Data Model when invariants change.

Aggregates enforce **invariants** and are the **transaction boundary** for writes. Prefer small aggregates; reference others by id.

Internal money unit: **USDC minor units** (6 decimals) + currency code. Prefer **basis points** (0–10_000) for percentages.

---

## Identity

### `ArtistAccount`

| | |
|--|--|
| **Root** | `ArtistAccountId` |
| **Entities** | ChannelProfile, SocialLink |
| **VOs** | Username, Biography, VerificationStatus |
| **Invariants** | Username unique (enforced at app + DB); verification not self-granted |
| **Commands** | RegisterArtist, UpdateChannel, RequestVerification |

### `FanAccount`

| | |
|--|--|
| **Root** | `FanAccountId` |
| **Invariants** | One primary auth subject |
| **Commands** | RegisterFan, UpdatePreferences |

---

## Catalog

### `Release`

| | |
|--|--|
| **Root** | `ReleaseId` |
| **Entities** | Track (ordered), CoverRef |
| **VOs** | ReleaseType, GenrePair, LocaleCode, PublishState |
| **Invariants** | ≥1 track to publish; cover required to publish; cannot mutate published identity fields without new version policy |
| **Commands** | CreateDraft, AddTrack, SetCover, PublishRelease, Unpublish |

### `Track` (entity inside Release **or** separate aggregate if reused across releases)

**Decision (ADR-aligned):** Track is an **entity of Release** for MVP simplicity.  
If compilation/reuse becomes first-class, promote `Track` to its own aggregate and reference by id (breaking change planned via versioned migration).

---

## Collaboration

### `SplitAgreement`

| | |
|--|--|
| **Root** | `SplitAgreementId` |
| **Entities** | SplitParticipant |
| **VOs** | CreativeRole, ShareBps |
| **Invariants** | Shares sum to 10_000 bps; each participant has role + payout destination ref |
| **Commands** | CreateAgreement, InviteCollaborator, AcceptInvite, ReplaceShares |
| **Policy** | `validateRoyaltySplits` from `@moc/domain` |

Scope: attached to `ReleaseId` or artist default template.

---

## Commerce

### `Listing`

| | |
|--|--|
| **Root** | `ListingId` |
| **VOs** | Price (Money), PricingModel set, Availability |
| **Invariants** | Price ≥ 0; at least one pricing model; references existing published Release/Track |
| **Commands** | CreateListing, UpdatePrice, ArchiveListing |

### `Order`

| | |
|--|--|
| **Root** | `OrderId` |
| **Entities** | OrderLine, PaymentAttempt |
| **VOs** | OrderStatus, IdempotencyKey |
| **Invariants** | Single successful payment; amount matches listing snapshot; buyer required |
| **Commands** | CreateOrder, AttachPayment, MarkPaid, Cancel, Expire |
| **Events** | `SaleCompleted` (when paid) |

Snapshot listing price/title at order creation (immutable commercial record).

---

## Licensing

### `LicenseGrant`

| | |
|--|--|
| **Root** | `LicenseGrantId` |
| **VOs** | Entitlement set, Expiry, SourceOrderId |
| **Invariants** | Grant references fan + work; no duplicate active grant for same (fan, work, entitlement) unless policy allows stacking |
| **Commands** | GrantFromSale, Revoke, Extend |
| **Policy** | `AccessPolicy` / `EvaluateAccessUseCase` |

---

## Royalties

### `RoyaltyLedger` (per artist / per agreement — choose one root strategy)

**Chosen strategy:** **`RoyaltyAccount`** per participant (collaborator payout identity), with entries as entities.

| | |
|--|--|
| **Root** | `RoyaltyAccountId` |
| **Entities** | LedgerEntry, Hold |
| **VOs** | PendingBalance, AvailableBalance, Money |
| **Invariants** | pending + available + withdrawn = sum(credits) − sum(debits); never negative available |
| **Commands** | CreditFromSale, ReleasePending, RequestWithdrawal, CompleteWithdrawal, FailWithdrawal |

### `AllocationBatch` (optional process aggregate)

Created per `SaleCompleted` to credit N accounts atomically in one app transaction (or saga with compensations).

| **Invariants** | Sum(allocations) = net distributable amount; idempotent on `saleId` |

---

## Settlement

### `Payout`

| | |
|--|--|
| **Root** | `PayoutId` |
| **VOs** | Rail (Circle/Base), ExternalRef, PayoutStatus |
| **Invariants** | Amount equals withdrawal request; terminal states immutable; retries keep same idempotency key |
| **Commands** | InitiatePayout, MarkSubmitted, MarkSucceeded, MarkFailed, Reconcile |

---

## Media

### `UploadSession`

| | |
|--|--|
| **Root** | `UploadSessionId` |
| **VOs** | StorageKey, Mime, Checksum, UploadStatus |
| **Commands** | BeginUpload, CompleteUpload, FailUpload |
| **Follow-up jobs** | Transcode, PinIpfs |

---

## Aggregate design rules

1. **One aggregate write per command** when possible  
2. Cross-aggregate consistency → **domain events** (not distributed transactions)  
3. IDs are ULIDs/UUIDv7 — time-sortable for partitions  
4. Soft-delete only where legally required; money rows never hard-deleted  
5. Optimistic concurrency (`version` column) on money aggregates  

## Consistency matrix (writes)

| Command | Aggregates touched | Pattern |
|---------|--------------------|---------|
| PublishRelease | Release (+ validate SplitAgreement) | Single TX + event |
| PayOrder | Order | TX → outbox `SaleCompleted` |
| On SaleCompleted | AllocationBatch → N RoyaltyAccounts | App service TX or outbox fan-out |
| Withdraw | RoyaltyAccount → Payout | Two-phase: hold funds, then settle |
