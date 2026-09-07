# Step 7 — Repositories

| Field | Value |
|-------|-------|
| **Purpose** | Step 7 — repository ports mapped to tables. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/07-repositories.md -->


Repositories load/save **aggregates**. Query ports serve read models.

---

## Write repositories (ports)

| Port | Aggregate | Persistence tables (schema) |
|------|-----------|----------------------------|
| `IArtistAccountRepository` | ArtistAccount | `identity.artist_accounts`, `channel_profiles`, `social_links` |
| `IFanAccountRepository` | FanAccount | `identity.fan_accounts`, … |
| `IReleaseRepository` | Release | `catalog.releases`, `tracks`, `release_covers` |
| `ISplitAgreementRepository` | SplitAgreement | `collaboration.split_agreements`, `split_participants` |
| `IListingRepository` | Listing | `commerce.listings`, `listing_pricing_models` |
| `IOrderRepository` | Order | `commerce.orders`, `order_lines`, `payment_attempts` |
| `ILicenseGrantRepository` | LicenseGrant | `licensing.license_grants` |
| `IRoyaltyAccountRepository` | RoyaltyAccount | `royalties.royalty_accounts`, `ledger_entries`, `balance_holds` |
| `IRoyaltyAllocationRepository` | RoyaltyAllocation | `royalties.royalty_allocations`, `allocation_lines` |
| `IPayoutRepository` | Payout | `settlement.payouts`, `payout_attempts` |
| `IUploadSessionRepository` | UploadSession | `media.upload_sessions` |
| `IMediaAssetRepository` | MediaAsset | `media.media_assets` |
| `IOutboxRepository` | OutboxMessage | `ops.outbox_messages` |
| `IIdempotencyRecordRepository` | IdempotencyRecord | `ops.idempotency_records` |

---

## Query ports (CQRS-light)

| Port | Purpose | Backing |
|------|---------|---------|
| `IPublicChannelQuery` | Fan-facing channel | projection / joins identity |
| `IReleasePublicQuery` | Marketplace card | catalog + media URLs |
| `IFanLibraryQuery` | Library list | licensing + catalog titles |
| `IRoyaltyEngineQuery` | Studio engine UI | accounts + timeline projection |
| `IPaymentTimelineQuery` | Incoming payments | `royalty_payment_timeline` read table |

---

## Repository contracts (canonical)

```
findById(id): Aggregate | null
save(aggregate): void   // insert or OCC update
```

Optional:

```
findByUsername(username): ArtistAccount | null
findAllocationBySaleId(saleId): RoyaltyAllocation | null
```

No:

```
updateBalanceSomehow(sql)  // bypasses invariants
```

---

## Mapping rules

1. Mapper in adapter: Prisma row(s) ↔ Aggregate  
2. Children loaded with root (aggregate size must stay bounded — e.g. ledger entries **not** fully loaded on every read; use `appendEntry` + balance columns)  
3. **Business decision DM-08:** `RoyaltyAccount` stores **materialized balances** on the root row; `ledger_entries` are the audit source; periodic reconciliation job verifies equality  

---

## Alignment with existing `@moc/ports`

| Existing | Action |
|----------|--------|
| `IOrderRepository` | Extend to canonical Order aggregate |
| `ILicenseGrantRepository` | Extend fields (entitlements, status) |
| Settlement/Blockchain adapters | Remain infra ports; not aggregate repos |
