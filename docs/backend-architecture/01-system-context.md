# 01 — System Context

| Field | Value |
|-------|-------|
| **Purpose** | Actors, external systems, and deployment units. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/01-system-context.md -->


## Product systems

```
┌─────────────────────────────────────────────────────────────────┐
│                     Music On Chain Platform                      │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Experience   │  │ Backend API      │  │ Workers           │  │
│  │ Next.js      │──│ NestJS Modular   │──│ BullMQ processors │  │
│  │ (Studio/Fan) │  │ Monolith         │  │                   │  │
│  └──────────────┘  └────────┬─────────┘  └─────────┬─────────┘  │
│                             │                        │           │
│              ┌──────────────┼────────────────────────┤           │
│              ▼              ▼                        ▼           │
│         PostgreSQL        Redis                   Object/CDN     │
│         (Prisma)       (cache/queues)              S3 + IPFS     │
└─────────────────────────────────────────────────────────────────┘
          │                │                    │
          ▼                ▼                    ▼
     Alchemy (Base)   Circle (USDC)      Observability
     RPC + webhooks   payments/settle   (logs/metrics/traces)
```

## Actors

| Actor | Goals | Primary BC touchpoints |
|-------|-------|------------------------|
| Artist | Publish, price, collaborate, withdraw royalties | Identity, Catalog, Royalties, Commerce |
| Fan | Discover, buy, listen, own access | Catalog, Commerce, Licensing, Identity |
| Collaborator | Receive split, withdraw | Royalties, Identity |
| Platform ops | Support, freeze, reconcile | Admin (cross-cutting) |
| System (workers) | Settle, index, pin, notify | All via application services |

## External systems

| System | Role | Port |
|--------|------|------|
| **PostgreSQL** | System of record | Repositories |
| **Redis** | Cache, locks, BullMQ broker | CachePort, QueuePort |
| **S3** | Private masters, covers, derivatives | ObjectStoragePort |
| **IPFS** | Public content-addressed metadata / optional public assets | MetadataPort |
| **Alchemy** | Base RPC, enhanced APIs, webhooks for chain events | BlockchainPort / ChainIndexerPort |
| **Circle** | USDC payment & treasury rails (fiat on/off, transfers) | PaymentRailPort / SettlementPort |
| **Base** | Settlement network for USDC | via Blockchain + Settlement adapters |
| **Privy** (or equiv.) | Auth for experience layer | Identity verification tokens → Identity BC |
| **CDN** | Fan media delivery | Read path only |

## Trust boundaries

1. **Public Internet** → Experience (Next.js) + public API gateway  
2. **Authenticated API** → NestJS (JWT / session from Privy-verified identity)  
3. **Private VPC** → Postgres, Redis, workers  
4. **Vendor edges** → Alchemy, Circle, S3, IPFS pinning service (signed requests only)

Chain keys / Circle credentials never leave the infrastructure layer or secrets manager.

## Request classes

| Class | Example | Sync? |
|-------|---------|-------|
| Interactive read | Track page, library | Yes (+ cache) |
| Interactive write | Update channel, create listing | Yes |
| Money write | Purchase, withdraw | Yes accept + async settle |
| Heavy media | Upload WAV, generate preview | Async after accept |
| Chain reconcile | Alchemy webhook | Async |

## Deployment units (year 1)

| Unit | Process | Scale axis |
|------|---------|------------|
| `api` | NestJS HTTP | Horizontal replicas behind LB |
| `worker` | NestJS + BullMQ processors | Horizontal by queue concurrency |
| `scheduler` | Repeatable jobs (reconcile, expire) | Single active (Redis lock) |

Same codebase, different entrypoints (`main.ts` vs `worker.ts`).
