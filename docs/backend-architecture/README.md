# Music On Chain — Backend Architecture

| Field | Value |
|-------|-------|
| **Purpose** | Production backend architecture: decomposition, BCs, ADRs, infra, and scale posture for NestJS + @moc packages. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model](../data-model/README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Hub](../README.md) · [Data Model](../data-model/README.md) · [Sprints](../sprints/README.md) · [ADRs](./adr/README.md) · [Standards](../_system/STANDARDS.md) · [Sprint 0](../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/README.md -->

> Screens and Next.js remain the **experience layer**. This set designs the **system of record and execution**.  
> Deep aggregates, Prisma, and DM-* decisions: **[Data Model](../data-model/README.md)** (canonical). This folder keeps the system view.

## Scale targets

| Dimension | Target (5y) | Architectural implication |
|-----------|-------------|---------------------------|
| Artists | 100,000 | Identity, catalog sharding keys, studio write paths |
| Fans | 10,000,000 | Read-heavy fan portals, cache, CDN |
| Tracks | 50,000,000 | Object storage + metadata DB partitioning |
| Royalty txs | Millions / year → burst | Async settlement, idempotency, outbox |
| Chain | Base | Adapter behind ports; Alchemy RPC/webhooks |
| Money | USDC | Circle + Base settlement adapters |

## Document map

| Doc | Contents |
|-----|----------|
| [00-principles.md](./00-principles.md) | Non-negotiables, quality attributes |
| [01-system-context.md](./01-system-context.md) | Actors, external systems, C4 context |
| [02-bounded-contexts.md](./02-bounded-contexts.md) | Bounded contexts & ownership |
| [03-ddd-aggregates.md](./03-ddd-aggregates.md) | Aggregates, invariants, consistency |
| [04-module-boundaries.md](./04-module-boundaries.md) | NestJS module map |
| [05-dependency-rules.md](./05-dependency-rules.md) | Allowed / forbidden dependencies |
| [06-folder-structure.md](./06-folder-structure.md) | Monorepo + NestJS layout |
| [07-application-services.md](./07-application-services.md) | Use cases / application services |
| [08-repositories.md](./08-repositories.md) | Repository ports & persistence strategy |
| [09-event-flow.md](./09-event-flow.md) | Domain events, outbox, consumers |
| [10-infrastructure.md](./10-infrastructure.md) | Postgres, Redis, BullMQ, S3, IPFS, Alchemy, Circle, Base |
| [11-scalability.md](./11-scalability.md) | Horizontal scale playbook |
| [12-security.md](./12-security.md) | AuthZ, tenancy, money safety |
| [adr/](./adr/) | Architecture Decision Records |
| [../data-model/](../data-model/README.md) | **Canonical data model** (domain → Prisma) |

## Alignment with existing Core Protocol packages

The Next.js monorepo already introduced:

| Package | Maps to |
|---------|---------|
| `@moc/domain` | Domain layer (aggregates, VOs, policies) |
| `@moc/ports` | Ports (repositories + infrastructure interfaces) |
| `@moc/application` | Application services / use cases |
| `@moc/adapters` | Driven adapters (Base first) |
| `@moc/shared` | Cross-cutting primitives (ids, result, clock) |

The NestJS backend **consumes and expands** these packages. It does not reinvent a second domain model.

## Delivery posture

1. **Modular monolith first** (NestJS) with strict BC boundaries  
2. **Extract services only when a BC needs independent scale/SLOs**  
3. **No business logic in controllers, Prisma models, or adapters**  
4. **Finance language in APIs for product** · chain details only in infrastructure  

## What this folder is not

- Not OpenAPI specs (those come later under `/docs/api`)
- Not Solidity design (see `packages/contracts`)
- Not UI wireframes
- Not runnable NestJS code yet

## Reading order (new engineer)

1. Principles → System context → Bounded contexts  
2. Aggregates → Dependency rules → Folder structure  
3. Event flow → Infrastructure → Scalability  
4. All ADRs in `adr/`
