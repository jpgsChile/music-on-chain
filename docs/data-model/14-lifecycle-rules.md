# Lifecycle Rules — Cascade, Soft Delete, Versioning

| Field | Value |
|-------|-------|
| **Purpose** | Cascade, soft delete, versioning, retention. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/14-lifecycle-rules.md -->


---

## Cascade rules

### Allowed CASCADE (composition)

Children that have **no meaning without parent** and are **not money**:

- Channel social links  
- Tracks of a draft release (see soft-delete note)  
- Listing pricing models  
- Payout attempts  
- Split participants when agreement soft-deleted (hard delete rare)

### FORBIDDEN CASCADE

Never `ON DELETE CASCADE` from:

- `orders` → anything that would erase commercial history  
- `royalty_accounts` → `ledger_entries`  
- `royalty_allocations` → lines after posting  
- `license_grants` (no parent FK across BC anyway)

### RESTRICT

Default for money and grants: delete parent must fail if children exist. Prefer soft-delete parent instead.

---

## Soft delete rules

| Aggregate / table | Soft delete? | Rule |
|-------------------|--------------|------|
| ArtistAccount / FanAccount | Yes (`deleted_at`) | Anonymize PII per legal job; keep id for FK/ID-refs |
| ChannelProfile | Via artist | Username freed only after grace period (**DM-13**) |
| Release | Yes | Unpublished + soft delete; tracks retained |
| Track | No independent | Deleted with release policy or tombstone row |
| SplitAgreement | Yes | Historical sales keep agreement id snapshot on order |
| Listing | Yes / ARCHIVED status | Prefer status=ARCHIVED |
| Order | **No** | Terminal states only |
| PaymentAttempt | **No** | |
| LicenseGrant | Status REVOKED | Not deleted |
| RoyaltyAccount | **No** | |
| LedgerEntry | **No** | |
| RoyaltyAllocation | **No** | |
| Payout | **No** | |
| MediaAsset | Yes | Soft delete; S3 lifecycle separate |
| Outbox | Archive/delete published after retention | Ops policy |

**Business decision DM-14:** Soft delete filters (`deleted_at IS NULL`) live in repositories by default. Admin queries may include deleted with explicit flag.

---

## Versioning rules

### Optimistic concurrency (`version` column)

Increment on every successful write to:

- `artist_accounts`, `fan_accounts`  
- `releases`  
- `split_agreements`  
- `listings`  
- `orders`  
- `license_grants`  
- `royalty_accounts`  
- `payouts`  

Conflict → `409 Conflict` / domain `ConcurrencyError` → client retry.

### Business / content versioning

| Concept | Approach |
|---------|----------|
| Release metadata after publish | **Immutable commercial core**; corrections = new Release or explicit `ReleaseAmendment` (future). **DM-15** |
| Split after publish | New agreement version only if policy allows; past sales keep old `split_agreement_id` on Order |
| Listing price | Mutable on Listing; Order stores snapshot |
| API / events | `/v1` + `*.v1` event names (ADR-012) |

### Schema versioning

- Prisma migration history is source of truth  
- Never edit applied migrations on main  
- Data model doc version bumps when DM-* decisions change  

---

## Retention

| Data | Retention |
|------|-----------|
| Ledger + payouts + paid orders | ≥ 7 years |
| Domain event audit (money) | ≥ 7 years |
| Outbox published rows | 30–90 days then archive |
| Upload sessions abandoned | 7 days |
| Idempotency records | until `expires_at` (24–72h typical) |
