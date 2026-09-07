# ADR-002 — PostgreSQL + Prisma

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-002-postgresql-prisma.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

We need a durable system of record for identity, catalog, orders, grants, and royalty ledgers with strong transactional guarantees and mature ops.

## Decision

- **PostgreSQL** as primary OLTP store  
- **Prisma** as the typed data-mapper for adapters (not for domain models)  
- Multi-file Prisma schemas by BC; logical SQL schemas  

SQLite remains acceptable only for local PoC leftovers in the web app — **not** for production backend.

## Consequences

**Positive:** ACID for money; Prisma migrate discipline; fits Nest adapters.  
**Negative:** Very large tables need partitioning discipline; Prisma not ideal for exotic SQL (escape via `$queryRaw` in adapters only).  
**Rule:** Domain never imports `@prisma/client`.

## Alternatives

| Option | Why not |
|--------|---------|
| MongoDB primary | Weaker invariants for ledgers |
| Drizzle/Kysely only | Viable later; Prisma already known in repo |
| Event store only | Higher complexity than needed year 1 |
