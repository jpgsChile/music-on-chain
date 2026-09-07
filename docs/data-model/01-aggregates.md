# Step 1 — Aggregates

| Field | Value |
|-------|-------|
| **Purpose** | Step 1 — aggregate catalog (canonical deep dive). |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/01-aggregates.md -->


An **aggregate** is a consistency boundary: one transaction, one optimistic version, invariants enforced on the root.

Cross-aggregate references use **IDs only** (no shared mutable graphs).

---

## Aggregate catalog

### Identity BC

#### `ArtistAccount` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | The business subject that publishes, owns catalog, and appears as “artist” in Studio |
| Consistency | Channel identity fields change atomically with social links set |
| Invariants | At most one live username; verification cannot be self-asserted to `VERIFIED` |

#### `FanAccount` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Buyer / library owner; distinct from artist even if same human |
| Invariants | One primary auth subject binding |

---

### Catalog BC

#### `Release` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Commercial & creative package fans discover (single/EP/album/…) |
| Contains | Ordered `Track` entities, cover reference |
| Invariants | Publish requires ≥1 track + cover; published core identity is immutable without a new release version policy |

**Business decision DM-01:** Track is an **entity inside Release** for the canonical model (not a separate aggregate). Compilations that reuse masters across releases are a future promotion (see DM-01 in decisions log).

---

### Collaboration BC

#### `SplitAgreement` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Legal/commercial agreement of who earns what on a work |
| Contains | `SplitParticipant` entities |
| Invariants | Sum(`shareBps`) = 10_000; each participant has role + beneficiary account ref |
| Scope | Either `DEFAULT` (artist template) or `RELEASE` (bound to one ReleaseId) |

---

### Commerce BC

#### `Listing` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Offer to sell access/download/license for a published work |
| Invariants | Price ≥ 0; ≥1 pricing model; subject must be published |

#### `Order` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Commercial commitment between fan and seller for a listing snapshot |
| Contains | `OrderLine`, `PaymentAttempt` |
| Invariants | At most one successful payment; amounts frozen at creation; idempotent create |

---

### Licensing BC

#### `LicenseGrant` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Fan entitlement after purchase (what they may play/download) |
| Invariants | Unique active grant per (fan, work, entitlementFamily) unless stacking policy says otherwise |

---

### Royalties BC

#### `RoyaltyAccount` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Finance account for a beneficiary (artist or collaborator) |
| Contains | `LedgerEntry` (entities), optional `Hold` |
| Invariants | `pending + available + withdrawnLifetime = credits − debits`; available never negative |

#### `RoyaltyAllocation` (root / process)

| Field | Meaning |
|-------|---------|
| Why it exists | Idempotent batch that distributes one sale across accounts |
| Invariants | Unique per `saleId`; sum(lines) = net distributable |

---

### Settlement BC

#### `Payout` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Execution of a withdrawal on the USDC rail (Circle/Base) |
| Invariants | Amount equals linked withdrawal; terminal states immutable; retries share idempotency key |

---

### Media BC

#### `UploadSession` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Lifecycle of a binary landing in object storage before attach |
| Invariants | Completed session has checksum + storage key |

#### `MediaAsset` (root)

| Field | Meaning |
|-------|---------|
| Why it exists | Durable pointer to S3 object (+ optional IPFS CID for public metadata) |
| Invariants | Storage key immutable after complete |

---

### Platform

#### `OutboxMessage` (technical aggregate / table)

Not a business aggregate, but a durability aggregate for reliable events.

#### `IdempotencyRecord` (technical)

Dedupes client retries for money commands.

---

## Aggregate size rules

1. Prefer **small roots** — do not embed Order inside Artist  
2. One command → one aggregate write (unless documented saga)  
3. Money aggregates always carry `version` for OCC  
4. Soft-delete is **not** allowed to break ledger history (see lifecycle rules)
