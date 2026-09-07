# Architecture Decision Records

| Field | Value |
|-------|-------|
| **Purpose** | Index of Architecture Decision Records. |
| **Dependencies** | [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [Architecture](../README.md) · [Data Model Decisions](../../data-model/15-business-decisions.md) · [C-BIND/1](../../C-BIND.md) · [Hub](../../README.md) |

<!-- doc-id: backend-architecture/adr/README.md -->


| ID | Title | Status |
|----|-------|--------|
| [ADR-001](./ADR-001-nestjs-modular-monolith.md) | NestJS modular monolith | Accepted |
| [ADR-002](./ADR-002-postgresql-prisma.md) | PostgreSQL + Prisma | Accepted |
| [ADR-003](./ADR-003-redis-bullmq.md) | Redis + BullMQ | Accepted |
| [ADR-004](./ADR-004-s3-ipfs-content.md) | S3 + IPFS content strategy | Accepted |
| [ADR-005](./ADR-005-base-usdc-settlement.md) | Base + USDC settlement | Accepted |
| [ADR-006](./ADR-006-alchemy-rpc.md) | Alchemy as chain access layer | Accepted |
| [ADR-007](./ADR-007-circle-payments.md) | Circle as USDC payment rail | Accepted |
| [ADR-008](./ADR-008-event-driven-royalties.md) | Event-driven royalty allocation | Accepted |
| [ADR-009](./ADR-009-cqrs-read-models.md) | CQRS-light read models | Accepted |
| [ADR-010](./ADR-010-hexagonal-ports.md) | Hexagonal ports & @moc packages | Accepted |
| [ADR-011](./ADR-011-identity-tenancy.md) | Identity & tenancy model | Accepted |
| [ADR-012](./ADR-012-api-versioning.md) | API versioning & compatibility | Accepted |

## ADR format

Each ADR states **Context → Decision → Consequences → Alternatives considered**.
