# Step 2 — Entities

| Field | Value |
|-------|-------|
| **Purpose** | Step 2 — entities inside aggregates. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/02-entities.md -->


Entities have **identity** that persists across attribute changes.

---

## Identity

### Inside `ArtistAccount`

| Entity | Identity | Attributes (conceptual) | Notes |
|--------|----------|-------------------------|-------|
| `ChannelProfile` | same as ArtistAccount (1:1) | displayName, biography, bannerRef, avatarRef, locale | Public projection source |
| `SocialLink` | `SocialLinkId` | platform, url | Set replaces as a collection on save |

### Inside `FanAccount`

| Entity | Identity | Notes |
|--------|----------|-------|
| `FanPreferences` | 1:1 with Fan | locale, marketing opt-in — optional embed |

---

## Catalog

### Inside `Release`

| Entity | Identity | Attributes | Notes |
|--------|----------|------------|-------|
| `Track` | `TrackId` | title, versionLabel, position, durationMs, explicit, lyricsRef, audioAssetId, previewAssetId | Ordered by `position` |
| `ReleaseCover` | 1:1 | imageAssetId | Required to publish |

---

## Collaboration

### Inside `SplitAgreement`

| Entity | Identity | Attributes | Notes |
|--------|----------|------------|-------|
| `SplitParticipant` | `SplitParticipantId` | displayName, email, role, shareBps, beneficiaryActorId? | Email used for invite; beneficiary bound on accept |
| `SplitInvite` | `SplitInviteId` | tokenHash, status, expiresAt | Optional; may be modeled as participant status |

---

## Commerce

### Inside `Order`

| Entity | Identity | Attributes | Notes |
|--------|----------|------------|-------|
| `OrderLine` | `OrderLineId` | listingId, workId, titleSnapshot, unitPriceMinor, quantity, pricingModel | Snapshot commercial truth |
| `PaymentAttempt` | `PaymentAttemptId` | rail, externalRef, status, amountMinor | Multiple attempts allowed; one success |

---

## Royalties

### Inside `RoyaltyAccount`

| Entity | Identity | Attributes | Notes |
|--------|----------|------------|-------|
| `LedgerEntry` | `LedgerEntryId` | type, amountMinor, saleId?, payoutId?, description | **Append-only** |
| `BalanceHold` | `HoldId` | amountMinor, reason, withdrawalId, status | Created on withdraw request |

### Inside `RoyaltyAllocation`

| Entity | Identity | Attributes | Notes |
|--------|----------|------------|-------|
| `AllocationLine` | `AllocationLineId` | royaltyAccountId, shareBps, amountMinor, roleSnapshot | Immutable after post |

---

## Settlement

### Inside `Payout`

| Entity | Identity | Notes |
|--------|----------|-------|
| `PayoutAttempt` | `PayoutAttemptId` | Rail submission tries; same logical payout |

---

## Media

### Inside `UploadSession`

No child entities required; state machine on root.

### `MediaAsset`

Standalone root entity/aggregate — referenced by Track/Cover by id.

---

## What is *not* an entity

| Concept | Instead |
|---------|---------|
| USDC amount | Value object `Money` |
| 60% share | Value object `ShareBps` |
| “Processing” status | Enum VO on aggregate |
| Tx hash | Infrastructure field on Settlement adapter mapping — not a Catalog entity |
