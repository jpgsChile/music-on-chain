# Step 4 — Relationships

| Field | Value |
|-------|-------|
| **Purpose** | Step 4 — relationships and ID-ref vs FK. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/04-relationships.md -->


Relationships are **semantic**. Persistence FKs follow; some cross-BC links are **logical IDs only** (no DB FK) to preserve bounded context independence.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **FK** | PostgreSQL foreign key inside same BC schema |
| **ID-ref** | UUID stored, no cross-schema FK (enforced in application) |
| **1** / **\*** / **0..1** | Cardinality |

---

## Within Identity

```
ArtistAccount 1 ── 1 ChannelProfile
ArtistAccount 1 ── * SocialLink
FanAccount 1 ── 0..1 FanPreferences
AuthBinding * ── 1 Actor (artist or fan)   # auth subject map
```

---

## Within Catalog

```
ArtistAccount (ID-ref) 1 ── * Release
Release 1 ── * Track
Release 1 ── 0..1 ReleaseCover
Track * ── 0..1 MediaAsset (audio)     # ID-ref to Media
Track * ── 0..1 MediaAsset (preview)
ReleaseCover ── 1 MediaAsset (image)
```

---

## Within Collaboration

```
ArtistAccount (ID-ref) 1 ── * SplitAgreement (DEFAULT)
Release (ID-ref) 0..1 ── 0..1 SplitAgreement (RELEASE)
SplitAgreement 1 ── * SplitParticipant
SplitParticipant 0..1 ── 0..1 Actor (beneficiary ID-ref)
```

**Business decision DM-05:** A RELEASE agreement is required before `PublishRelease` (or artist DEFAULT is cloned). Publishing without a resolvable 100% split is illegal in the domain.

---

## Within Commerce

```
Release|Track (ID-ref) 1 ── * Listing
Listing 1 ── * ListingPricingModel
FanAccount (ID-ref) 1 ── * Order
Order 1 ── * OrderLine
Order 1 ── * PaymentAttempt
OrderLine * ── 1 Listing (ID-ref + snapshot columns)
```

---

## Within Licensing

```
FanAccount (ID-ref) 1 ── * LicenseGrant
Order (ID-ref) 1 ── * LicenseGrant
Release|Track (ID-ref) 1 ── * LicenseGrant
```

---

## Within Royalties

```
Actor (ID-ref) 1 ── * RoyaltyAccount
RoyaltyAccount 1 ── * LedgerEntry
RoyaltyAccount 1 ── * BalanceHold
Sale/Order (ID-ref) 1 ── 0..1 RoyaltyAllocation
RoyaltyAllocation 1 ── * AllocationLine
AllocationLine * ── 1 RoyaltyAccount (FK within royalties schema)
```

---

## Within Settlement

```
BalanceHold / Withdrawal (ID-ref) 1 ── 0..1 Payout
Payout 1 ── * PayoutAttempt
```

---

## Within Media

```
ArtistAccount (ID-ref) 1 ── * UploadSession
UploadSession 0..1 ── 0..1 MediaAsset
```

---

## Cross-BC matrix (no FK)

| From | To | Link | Why no FK |
|------|----|------|-----------|
| Release.artistId | ArtistAccount | ID-ref | Identity BC ownership |
| Listing.workId | Release/Track | ID-ref | Catalog autonomy |
| Order.buyerId | FanAccount | ID-ref | Identity autonomy |
| LicenseGrant.orderId | Order | ID-ref | Event-driven creation |
| RoyaltyAllocation.saleId | Order | ID-ref | Idempotent consumer |
| Payout.withdrawalId | Hold | ID-ref | Settlement isolation |
| Track.audioAssetId | MediaAsset | ID-ref | Media isolation |

**Business decision DM-06:** Cross-BC referential integrity is enforced by **application services + integration tests**, not database FKs across schemas. This enables future service extraction.

---

## Cascade philosophy (preview)

- Inside aggregate: cascade delete children when root hard-deleted (rare)  
- Money: **never cascade-delete** ledger or paid orders  
- Soft-delete roots; children remain for audit  

Details: [14-lifecycle-rules.md](./14-lifecycle-rules.md)
