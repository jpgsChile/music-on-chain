# 10 — Infrastructure Layer

| Field | Value |
|-------|-------|
| **Purpose** | Postgres, Redis, BullMQ, S3, IPFS, Alchemy, Circle, Base. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/10-infrastructure.md -->


Infrastructure implements ports. Product language stays in application/API presenters.

---

## Component map

| Concern | Technology | Port(s) |
|---------|------------|---------|
| OLTP DB | PostgreSQL + Prisma | Repositories |
| Cache / locks | Redis | `CachePort`, `LockPort` |
| Jobs | BullMQ on Redis | `QueuePort` / processors |
| Private media | S3 (or S3-compatible) | `ObjectStoragePort` |
| Public content address | IPFS (pinning provider) | `MetadataPort` / `IpfsPort` |
| Base access | Alchemy | `BlockchainPort`, `ChainWebhookPort` |
| USDC rails | Circle | `PaymentRailPort`, `SettlementPort` |
| Settlement network | Base | via Alchemy + Circle adapters |

---

## PostgreSQL

- Primary region with sync standby (year 1)  
- Logical schemas per BC  
- Migrations only via Prisma migrate in CI  
- Connection pooling: PgBouncer / Prisma pool sized per api+worker pods  
- Partition hot tables (ledger entries, outbox) by time  

### Index guidance (examples)

- `tracks (artist_id, created_at DESC)`  
- `orders (buyer_id, created_at DESC)`  
- `orders (idempotency_key) UNIQUE`  
- `royalty_entries (account_id, created_at)`  
- `royalty_allocations (sale_id) UNIQUE`  
- `payouts (external_ref) UNIQUE`  

---

## Redis

Uses:

1. BullMQ broker  
2. Cache-aside  
3. Short-lived distributed locks (withdraw per account)  
4. Rate limiting  

Separate Redis DBs/logical instances for **cache** vs **queue** when scale demands (avoid eviction killing jobs).

---

## BullMQ

- Queues named by BC (see module boundaries)  
- Job payloads = IDs + small metadata (not huge JSON blobs)  
- `removeOnComplete` limited; failed jobs retained for replay  
- Worker horizontal scale by concurrency + replica count  

---

## S3

| Asset | Bucket prefix | Access |
|-------|---------------|--------|
| Masters (WAV) | `masters/{artistId}/` | Private; signed GET for processing |
| Previews | `previews/` | CDN / signed |
| Covers | `covers/` | CDN public or signed |
| Temporary uploads | `uploads/` | Short-lived PUT URLs |

Never store masters on IPFS by default (cost/privacy). IPFS = metadata & optional public artifacts.

---

## IPFS

- Publish release metadata JSON → CID  
- Pin via pinning service API  
- Store CID on Release projection  
- Gateway URL for public resolution — not a substitute for S3 durability  

---

## Alchemy (Base)

Responsibilities:

- RPC for any required on-chain reads/writes performed by settlement adapter  
- Address activity webhooks for USDC transfers related to treasury/payout addresses  
- Reliable delivery → `/internal/webhooks/alchemy`  

Adapter maps webhook → `HandleAlchemyWebhookUseCase`.  
No Alchemy types beyond adapter boundary.

---

## Circle

Responsibilities:

- Payment intents / checkout USDC (fan purchase)  
- Payouts to collaborators (artist withdrawals)  
- Treasury movement policies  

Adapter maps Circle webhooks → settlement/royalties completion commands.  
UI sees: `processing | available | paid | failed` — not Circle resource ids (ops may see them in admin).

---

## Base

- Chain of record for USDC settlement when on-chain rail is used  
- Application never branches on gas or nonce — adapter owns that  
- Existing `BaseSettlementAdapter` is the seed implementation to harden  

---

## Outbox relay

Dedicated worker process or processor:

- Polls `ops.outbox`  
- Publishes to BullMQ  
- Metrics: `outbox_lag_seconds`  

---

## Secrets & config

| Secret | Consumer |
|--------|----------|
| `DATABASE_URL` | Prisma |
| `REDIS_URL` | Redis/BullMQ |
| `S3_*` | Media adapter |
| `IPFS_PINNING_TOKEN` | IPFS adapter |
| `ALCHEMY_API_KEY` / webhook secret | Alchemy adapter |
| `CIRCLE_API_KEY` / webhook secret | Circle adapter |

Injected via env in deploy; never committed.  
`ConfigModule` loads into typed config objects at infrastructure edge.

---

## Local / staging parity

| Service | Local |
|---------|-------|
| Postgres | Docker |
| Redis | Docker |
| S3 | Localstack or MinIO |
| IPFS | Mock metadata adapter |
| Alchemy | Mock + recorded fixtures |
| Circle | Sandbox API |

Domain/application tests use fakes — no Docker required.
