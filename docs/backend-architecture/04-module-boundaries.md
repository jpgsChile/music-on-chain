# 04 — Module Boundaries (NestJS)

| Field | Value |
|-------|-------|
| **Purpose** | NestJS module boundaries per BC. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/04-module-boundaries.md -->


NestJS **modules = bounded contexts** (+ shared kernel + infrastructure host).

---

## Module catalog

| Nest module | BC | Public API surface |
|-------------|----|--------------------|
| `IdentityModule` | Identity | Internal facades: `ActorDirectory`, channel commands |
| `CatalogModule` | Catalog | Release/Track commands & queries |
| `CollaborationModule` | Collaboration | Split agreements |
| `CommerceModule` | Commerce | Listings, orders, checkout |
| `LicensingModule` | Licensing | Grants, access evaluation |
| `RoyaltiesModule` | Royalties | Balances, withdraw requests, engine queries |
| `SettlementModule` | Settlement | Payout execution, reconcile webhooks |
| `MediaModule` | Media | Upload URLs, asset status |
| `NotificationModule` | Notification | Prefer consume-only |
| `SearchModule` | Search | Query API + index workers |
| `AdminModule` | Admin | Ops-only controllers |
| `PlatformModule` | Shared | Health, metrics, idempotency middleware |
| `InfrastructureModule` | Infra | Prisma, Redis, BullMQ, S3, IPFS, Alchemy, Circle wiring |

---

## Controller ownership

| Route prefix | Module | Audience |
|--------------|--------|----------|
| `/v1/me` | Identity | Artist/Fan |
| `/v1/channel` | Identity | Artist Studio |
| `/v1/releases` | Catalog | Artist Studio |
| `/v1/splits` | Collaboration | Artist Studio |
| `/v1/listings` | Commerce | Artist / public |
| `/v1/checkout` | Commerce | Fan |
| `/v1/library` | Licensing | Fan |
| `/v1/access` | Licensing | Fan / player |
| `/v1/royalties` | Royalties | Artist / collaborator |
| `/v1/payouts` | Settlement (thin) | Artist — status only |
| `/v1/uploads` | Media | Artist |
| `/v1/search` | Search | Public |
| `/internal/webhooks/alchemy` | Settlement | Vendor |
| `/internal/webhooks/circle` | Settlement | Vendor |
| `/admin/*` | Admin | Ops |

Product-facing payout routes return **finance states**, never raw chain payloads.

---

## Worker module ownership (BullMQ queues)

| Queue name | Owner module | Job examples |
|------------|--------------|--------------|
| `media.transcode` | Media | preview mp3, waveform |
| `media.ipfs` | Media | pin metadata CID |
| `catalog.index` | Search | upsert search doc |
| `royalties.allocate` | Royalties | process SaleCompleted |
| `settlement.execute` | Settlement | submit payout |
| `settlement.reconcile` | Settlement | poll/webhook match |
| `notify.deliver` | Notification | email/push |
| `chain.index` | Settlement | process Alchemy activity |

---

## Forbidden couplings (enforced by lint/review)

- `CatalogModule` must not import `SettlementModule`  
- `RoyaltiesModule` must not import Circle/Alchemy SDKs  
- `CommerceModule` must not write royalty balances directly  
- Controllers must not inject PrismaService for business writes (use application services)  
- UI/Next.js must not call worker queues directly  

Allowed: modules depend on **application facades / ports** exported via a thin `*-api` barrel per BC (see dependency rules).

---

## Shared kernel (minimal)

Located in `@moc/shared` + `apps/api/src/shared`:

- `ActorId`, `CorrelationId`, `Money`, `Result`, `Clock`, `IdGenerator`  
- Domain error hierarchy mapping to HTTP  

No “god” `SharedModule` that re-exports all BCs.
