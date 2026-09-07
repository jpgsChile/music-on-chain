# 08 — Repositories

| Field | Value |
|-------|-------|
| **Purpose** | Repository ports and persistence strategy. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/08-repositories.md -->


Repositories are **ports** in `@moc/ports`, implemented by Prisma (or other) adapters.

---

## Repository port catalog

### Identity
- `IArtistAccountRepository`
- `IFanAccountRepository`
- `IUsernameUniqueChecker` (or unique constraint + catch)

### Catalog
- `IReleaseRepository`
- `IReleaseQuery` (read model / projections)

### Collaboration
- `ISplitAgreementRepository`

### Commerce
- `IListingRepository`
- `IOrderRepository` *(exists)*

### Licensing
- `ILicenseGrantRepository` *(exists)*

### Royalties
- `IRoyaltyAccountRepository`
- `IRoyaltyAllocationRepository` (idempotency by saleId)
- `IRoyaltyPaymentTimelineQuery`

### Settlement
- `IPayoutRepository`
- `ISettlementReconciliationRepository`

### Media
- `IUploadSessionRepository`
- `IAssetRepository`

### Platform
- `IOutboxRepository`
- `IIdempotencyRecordRepository`

---

## Port shape conventions

```ts
interface IReleaseRepository {
  findById(id: ReleaseId): Promise<Release | null>;
  save(release: Release): Promise<void>; // insert or optimistic update
}
```

- Repositories speak **domain aggregates**, not Prisma models  
- Mappers live in adapters (`toDomain` / `toPersistence`)  
- Queries that return UI-optimized DTOs use `*Query` ports (CQRS-light) — do not pollute write repos  

---

## Existing ports to extend (not break)

From current `@moc/ports`:

| Port | Evolution |
|------|-----------|
| `IOrderRepository` | Keep; add idempotency & snapshot fields |
| `ILicenseGrantRepository` | Keep |
| `ISettlementAdapter` | Remains infrastructure port; Settlement BC uses it |
| `IRoyaltyAdapter` | Prefer domain ledger first; adapter = rail execution |
| `IBlockchainAdapter` / `ITokenAdapter` / `IWalletAdapter` | Infrastructure only; hide from product APIs |
| `IMetadataAdapter` | IPFS/S3 metadata publish |
| `BaseSettlementAdapter` | First Base implementation under adapters |

---

## Persistence strategies by scale

| Data | Strategy |
|------|----------|
| Identity, listings | Regular OLTP tables + indexes |
| Releases / tracks (50M) | Partition tracks by `created_at` or hash(`artist_id`); cover/audio in S3 |
| Orders | Hot indexes on buyer/seller; archive cold partitions yearly |
| Royalty ledger entries | Append-only; partition by month; account balances materialized |
| Outbox | Poller with `FOR UPDATE SKIP LOCKED`; partition by processed_at |
| Timeline / analytics | Read models / materialized views refreshed async |

---

## Optimistic concurrency

Money aggregates (`RoyaltyAccount`, `Order`, `Payout`) include `version INT`.  
`save` performs `UPDATE … WHERE id AND version` and increments.

---

## Caching (Redis)

| Key pattern | TTL | Invalidate on |
|-------------|-----|---------------|
| `channel:{username}` | 60s | channel update |
| `release:{id}:public` | 30s | publish/unpublish |
| `access:{fan}:{work}` | 15s | grant change |
| `royalties:engine:{artist}` | 10s | allocation/withdraw |

Cache-aside only; money balances may be cached briefly but withdraw always re-reads DB.

---

## Anti-patterns

- Repository methods named like SQL (`joinOrdersWithTracks…`) exposed to application without intent  
- Returning `Prisma.X` from ports  
- Cross-BC joins inside one repository — use composition at application layer or read model builder
