# ADR-010 — Hexagonal ports & @moc packages

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-010-hexagonal-ports.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

The monorepo already introduced `@moc/domain`, `@moc/ports`, `@moc/application`, `@moc/adapters`, `@moc/shared`. The NestJS backend must not invent a parallel architecture.

## Decision

- **Domain / ports / application / adapters** packages remain the canonical layers  
- NestJS `apps/api` and `apps/worker` are **host composition roots** that wire adapters and expose HTTP/jobs  
- Existing ports (`ISettlementAdapter`, `IOrderRepository`, …) are extended, not replaced by incompatible abstractions  

## Consequences

**Positive:** Continuity from Core Protocol skeleton; testable domain; vendor isolation.  
**Negative:** Package boundaries require CI enforcement.  

## Alternatives

| Option | Why not |
|--------|---------|
| Fat Nest modules with Prisma in services | Unmaintainable at 5 years |
| Rewrite domain inside Nest only | Forks existing `@moc/domain` work |
