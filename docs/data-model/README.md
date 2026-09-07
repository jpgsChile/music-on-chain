# Music On Chain — Canonical Data Model

| Field | Value |
|-------|-------|
| **Purpose** | Canonical domain→PostgreSQL/Prisma model: aggregates through persistence rules and DM-* decisions. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Hub](../README.md) · [Architecture](../backend-architecture/README.md) · [Sprint 0](../sprints/sprint-0.md) · [Standards](../_system/STANDARDS.md) · [DM Decisions](./15-business-decisions.md) |

<!-- doc-id: data-model/README.md -->

> **Rule:** Tables are a *projection* of the domain. Start from business meaning, then derive persistence.  
> System context and Nest modules: [Backend Architecture](../backend-architecture/README.md).

## Scale assumptions (shape the model)

| Dimension | Target | Modeling implication |
|-----------|--------|----------------------|
| Artists | 100K | `artist_id` as partition/filter key |
| Fans | 10M | Grants & orders indexed by `fan_id` |
| Tracks | 50M | Tracks as rows; binaries out-of-band (S3) |
| Royalty txs | Millions | Append-only ledger; never update amounts in place |

## Reading order (mandatory)

| Step | Document |
|------|----------|
| 1 | [01-aggregates.md](./01-aggregates.md) |
| 2 | [02-entities.md](./02-entities.md) |
| 3 | [03-value-objects.md](./03-value-objects.md) |
| 4 | [04-relationships.md](./04-relationships.md) |
| 5 | [05-commands.md](./05-commands.md) |
| 6 | [06-events.md](./06-events.md) |
| 7 | [07-repositories.md](./07-repositories.md) |
| Synthesis | [08-domain-model.md](./08-domain-model.md) |
| Diagrams | [09-aggregate-diagram.md](./09-aggregate-diagram.md) · [10-er-diagram.md](./10-er-diagram.md) |
| Persistence | [11-prisma-mapping.md](./11-prisma-mapping.md) · [prisma/](./prisma/) |
| Ops rules | [12-migration-strategy.md](./12-migration-strategy.md) · [13-indexes-constraints.md](./13-indexes-constraints.md) · [14-lifecycle-rules.md](./14-lifecycle-rules.md) |
| Decisions | [15-business-decisions.md](./15-business-decisions.md) |

## Non-goals (this pack)

- Not runtime NestJS code  
- Not migrating the current Next.js SQLite PoC in place  
- Not Solidity storage layouts  

## Ubiquitous language (money)

- Amounts stored as **integer minor units** of USDC (6 decimals)  
- Shares stored as **basis points** (0–10_000 = 100%)  
- Product APIs may format decimals; the database does not store `FLOAT` money
