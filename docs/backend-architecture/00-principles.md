# 00 — Architecture Principles

| Field | Value |
|-------|-------|
| **Purpose** | Quality attributes and non-negotiables for the backend. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/00-principles.md -->


## Mission

Music On Chain is a **music distribution and direct-to-fan commerce platform**.  
Blockchain (Base), USDC, and settlement rails are **infrastructure**, not the product surface.

The backend must remain understandable, testable, and evolvable for **five years**.

---

## Quality attributes (ordered)

1. **Correctness of money** — royalty math and settlement must be auditable and idempotent  
2. **Availability of reads** — catalog, fan library, artist studio dashboards  
3. **Durability** — never lose a sale, grant, or royalty allocation  
4. **Horizontal scalability** — add API / worker replicas without redesign  
5. **Observability** — every money and access decision is traceable  
6. **Developer velocity** — clear module ownership, no spaghetti across BCs  
7. **Security & tenancy** — artists and fans never see each other’s private finance  

Latency of chain confirmation is **asynchronous** relative to UX where possible (optimistic grant + eventual settlement), with explicit state machines.

---

## Non-negotiables

### N1 — Hexagonal / Ports & Adapters

- Domain has **zero** imports from Nest, Prisma, Redis, S3, Alchemy, Circle, or HTTP  
- Application depends on **ports** only  
- Adapters implement ports and live at the edges  

### N2 — Bounded contexts own their data

- No shared mutable tables across BCs  
- Cross-BC collaboration via **application orchestration** or **domain/integration events**  
- Foreign keys across BC databases/schemas are forbidden in the long-term model (same Postgres instance may host multiple schemas initially)

### N3 — Money is a first-class domain

- Amounts are value objects (minor units + currency)  
- Splits must sum to 100% (basis points preferred internally)  
- Every allocation references a source payment idempotency key  

### N4 — Product APIs hide chain

Public/studio APIs speak:

- Account, Ownership, Payment, Settlement, Activity, Catalog  

Never required in client contracts:

- Wallet Address (as primary UX), Tx Hash, Gas, RPC, Signer, Nonce, Contract Address  

Internal ops/admin and infrastructure logs may retain chain references.

### N5 — Async by default for heavy work

Use BullMQ for:

- Media processing / transcoding jobs  
- IPFS pin + metadata publish  
- Royalty calculation & settlement batches  
- Chain indexing / webhook reconciliation  
- Notifications & email/push  

### N6 — Idempotency everywhere money touches

- `Idempotency-Key` on purchase, withdraw, settlement retry  
- Unique constraints on payment external ids (Circle / chain event ids)  
- Outbox + consumer dedupe keys  

### N7 — Modular monolith → selective extraction

Start as one NestJS deployable with modules = BCs.  
Extract when a BC has:

- Independent scaling curve, or  
- Independent release cadence, or  
- Blast-radius isolation requirement (payments)

### N8 — Compatibility with existing `@moc/*` packages

Domain policies already living in `@moc/domain` remain the canonical home.  
NestJS modules wrap them; they do not fork them.

---

## Consistency model

| Concern | Consistency |
|---------|-------------|
| Catalog publish metadata | Strong within Release aggregate |
| Fan access after purchase | Strong on grant write; read-your-writes via cache invalidation |
| Royalty splits after sale | Strong allocation ledger; eventual on-chain settlement |
| Analytics | Eventual (read models) |
| Search index | Eventual |

---

## Explicitly deferred (not abandoned)

- Multi-chain (Base only for MVP+horizon year 1–2)  
- Multi-currency (USDC only)  
- Full event sourcing of all aggregates (selective event log for money)  
- Microservices mesh / service mesh day one  

Document any change to these in a new ADR.
