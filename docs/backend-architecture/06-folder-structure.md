# 06 — Folder Structure

| Field | Value |
|-------|-------|
| **Purpose** | Monorepo and NestJS folder layout. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/06-folder-structure.md -->


Target layout for the **production monorepo** (evolves current repo without breaking Next.js).

```
music-on-chain/
├── apps/
│   ├── web/                          # Next.js experience (current app migrates here)
│   ├── api/                          # NestJS HTTP API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   ├── modules/
│   │   │   │   ├── identity/
│   │   │   │   │   ├── identity.module.ts
│   │   │   │   │   ├── api/                 # controllers, DTOs, presenters
│   │   │   │   │   ├── application/         # nest wrappers → @moc/application
│   │   │   │   │   └── persistence/         # prisma repos implementing ports
│   │   │   │   ├── catalog/
│   │   │   │   ├── collaboration/
│   │   │   │   ├── commerce/
│   │   │   │   ├── licensing/
│   │   │   │   ├── royalties/
│   │   │   │   ├── settlement/
│   │   │   │   ├── media/
│   │   │   │   ├── notification/
│   │   │   │   ├── search/
│   │   │   │   ├── admin/
│   │   │   │   └── platform/
│   │   │   ├── infrastructure/
│   │   │   │   ├── prisma/
│   │   │   │   ├── redis/
│   │   │   │   ├── bullmq/
│   │   │   │   ├── s3/
│   │   │   │   ├── ipfs/
│   │   │   │   ├── alchemy/
│   │   │   │   ├── circle/
│   │   │   │   └── outbox/
│   │   │   └── shared/
│   │   ├── test/
│   │   └── package.json
│   └── worker/                       # NestJS worker entry (same modules, no public HTTP)
│       ├── src/
│       │   ├── main.ts               # processors only
│       │   └── worker.module.ts
│       └── package.json
│
├── packages/
│   ├── domain/                       # @moc/domain   (existing — expand)
│   │   └── src/
│   │       ├── identity/
│   │       ├── catalog/
│   │       ├── collaboration/
│   │       ├── commerce/
│   │       ├── licensing/
│   │       ├── royalties/
│   │       ├── settlement/
│   │       ├── media/
│   │       └── shared/               # DomainEvent, DomainError, Money, …
│   ├── ports/                        # @moc/ports    (existing — expand)
│   │   └── src/
│   │       ├── repositories/
│   │       ├── payment/
│   │       ├── settlement/
│   │       ├── blockchain/
│   │       ├── storage/
│   │       ├── metadata/
│   │       ├── cache/
│   │       └── messaging/
│   ├── application/                  # @moc/application (existing — expand)
│   │   └── src/
│   │       ├── identity/use-cases/
│   │       ├── catalog/use-cases/
│   │       ├── collaboration/use-cases/
│   │       ├── commerce/use-cases/
│   │       ├── licensing/use-cases/
│   │       ├── royalties/use-cases/
│   │       ├── settlement/use-cases/
│   │       └── media/use-cases/
│   ├── adapters/                     # @moc/adapters (existing — expand)
│   │   └── src/
│   │       ├── persistence/prisma/
│   │       ├── cache/redis/
│   │       ├── queue/bullmq/
│   │       ├── storage/s3/
│   │       ├── metadata/ipfs/
│   │       ├── blockchain/alchemy/
│   │       ├── blockchain/base/
│   │       └── payments/circle/
│   ├── contracts/                    # Solidity (future) — not imported by domain
│   ├── shared/                       # @moc/shared
│   └── config-eslint/                # boundary rules (optional)
│
├── prisma/                           # OR packages/adapters/.../prisma
│   ├── schema/
│   │   ├── schema.prisma             # generator + datasource
│   │   ├── identity.prisma
│   │   ├── catalog.prisma
│   │   ├── commerce.prisma
│   │   ├── licensing.prisma
│   │   ├── royalties.prisma
│   │   ├── settlement.prisma
│   │   └── media.prisma
│   └── migrations/
│
├── docs/
│   └── backend-architecture/         # ← this set
│
└── package.json                      # workspace root
```

---

## Per-BC Nest folder convention

```
modules/royalties/
  royalties.module.ts
  api/
    royalties.controller.ts
    dto/
    presenters/                 # domain → HTTP JSON (finance language)
  application/
    royalties.facade.ts         # thin Nest injectable delegating to @moc/application
  persistence/
    royalty-account.prisma-repository.ts
  workers/
    allocate-sale.processor.ts
```

Domain types stay in `packages/domain` — Nest folders do not redefine aggregates.

---

## Prisma multi-file schema

Use Prisma multi-file schemas partitioned by BC to reduce merge conflicts and clarify ownership. Physical DB may remain one PostgreSQL cluster with schemas:

- `identity`, `catalog`, `commerce`, `licensing`, `royalties`, `settlement`, `media`, `ops`

---

## What stays out of `apps/web`

- Prisma client for money writes  
- Circle / Alchemy SDKs  
- BullMQ producers for settlement (API mediates)

Web talks to `apps/api` over versioned HTTP (`/v1`).
