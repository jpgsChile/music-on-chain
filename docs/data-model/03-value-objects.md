# Step 3 — Value Objects

| Field | Value |
|-------|-------|
| **Purpose** | Step 3 — value objects and money/share rules. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [C-BIND/1](../C-BIND.md) · [Hub](../README.md) |

<!-- doc-id: data-model/03-value-objects.md -->


Value objects are immutable and compared by value. In PostgreSQL they become **columns or owned JSON** with check constraints — never independent tables *unless* querying requires it.

---

## Identity & text

| VO | Representation | Rules |
|----|----------------|-------|
| `ActorId` | ULID/UUID string | Opaque; never reuse. Current persistence: `Actor.actorRef` (C-BIND ActorRef local encoding). See [C-BIND/1](../C-BIND.md). |
| `Username` | string 3–30 | `[a-z0-9._]`; stored without `@` |
| `EmailAddress` | string | Normalized lowercase |
| `Biography` | string ≤ 500/1000 | Trimmed |
| `DisplayName` | string ≤ 120 | Non-empty for publish surfaces |
| `LocaleCode` | string | BCP-47 subset (`es`, `en`, …) |
| `CorrelationId` | string | Tracing |

---

## Catalog

| VO | Rules |
|----|-------|
| `ReleaseType` | `SINGLE \| EP \| ALBUM \| DEMO \| LIVE \| RARE \| REHEARSAL` |
| `PublishState` | `DRAFT \| PUBLISHED \| UNPUBLISHED` |
| `GenreCode` | Controlled vocabulary string |
| `GenrePair` | primary required; secondary optional ≠ primary |
| `TrackPosition` | int ≥ 1 unique within release |
| `DurationMs` | int ≥ 0 |
| `ExplicitFlag` | boolean |
| `ContentRef` | `{ storageKey }` or `{ assetId }` — pointers only |

---

## Collaboration

| VO | Rules |
|----|-------|
| `CreativeRole` | `ARTIST \| AUTHOR \| COMPOSER \| PRODUCER \| PERFORMER \| OTHER` |
| `ShareBps` | int 0…10000; agreement sum = 10000 |
| `AgreementScope` | `DEFAULT \| RELEASE` |
| `InviteStatus` | `PENDING \| ACCEPTED \| REVOKED \| EXPIRED` |

**Business decision DM-02:** Internally use **basis points**, not floats. UI may show `%`.

---

## Commerce / money

| VO | Rules |
|----|-------|
| `Money` | `{ amountMinor: bigint/int, currency: 'USDC' }` |
| `PricingModel` | `STREAMING \| DOWNLOAD \| LIMITED \| LICENSE` |
| `PricingModelSet` | non-empty set |
| `OrderStatus` | `CREATED \| AWAITING_PAYMENT \| PAID \| CANCELLED \| EXPIRED` |
| `PaymentAttemptStatus` | `PENDING \| SUCCEEDED \| FAILED \| CANCELLED` |
| `IdempotencyKey` | client string ≤ 128; unique per actor+action family |

**Business decision DM-03:** Only `USDC` in canonical model (ADR-005). Currency column exists for forward safety but check constraint = `USDC`.

---

## Licensing

| VO | Rules |
|----|-------|
| `Entitlement` | `STREAM \| DOWNLOAD \| LICENSE_SYNC \| …` |
| `GrantStatus` | `ACTIVE \| REVOKED \| EXPIRED` |
| `AccessDecision` | computed, not stored (policy) |

---

## Royalties

| VO | Rules |
|----|-------|
| `LedgerEntryType` | `CREDIT_SALE \| RELEASE_PENDING \| HOLD \| CAPTURE_WITHDRAW \| RELEASE_HOLD \| ADJUSTMENT` |
| `AccountBalances` | pendingMinor, availableMinor, withdrawnLifetimeMinor |
| `WithdrawalStatus` | `REQUESTED \| PROCESSING \| COMPLETED \| FAILED \| CANCELLED` |

---

## Settlement

| VO | Rules |
|----|-------|
| `PayoutStatus` | `INITIATED \| SUBMITTED \| SUCCEEDED \| FAILED \| RECONCILED` |
| `SettlementRail` | `CIRCLE \| BASE_USDC` (infra enum; product sees finance states) |
| `ExternalRef` | vendor id string — unique when present |

---

## Media

| VO | Rules |
|----|-------|
| `UploadStatus` | `PENDING \| UPLOADED \| FAILED \| EXPIRED` |
| `AssetKind` | `AUDIO_MASTER \| AUDIO_PREVIEW \| IMAGE_COVER \| IMAGE_AVATAR \| IMAGE_BANNER \| METADATA_JSON` |
| `ChecksumSha256` | hex string |
| `IpfsCid` | optional string |

---

## Persistence guidance

| VO type | Postgres mapping |
|---------|------------------|
| Enum-like | Prisma `enum` |
| Money | `amount_minor BIGINT` + `currency CHAR(4)` |
| Share | `share_bps INT` |
| Sets (pricing models) | enum[] **or** join table — **decision DM-04:** `PricingModel` as join table `listing_pricing_models` for integrity |
| Social links | child table (entity), not freeform JSON blob for URLs we query |
