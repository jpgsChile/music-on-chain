# ADR-001 — NestJS modular monolith

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-001-nestjs-modular-monolith.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

Music On Chain must leave hackathon structure and support multi-year evolution toward 100K artists / 10M fans. Premature microservices increase ops cost and blur transactional integrity for money flows.

## Decision

Build the backend as a **NestJS modular monolith**:

- One primary deployable (`apps/api`) + worker entrypoint (`apps/worker`)  
- Modules map 1:1 to bounded contexts  
- Extract services later only when scale/ownership triggers fire  

## Consequences

**Positive:** Shared transactions + outbox; simpler tracing; faster feature delivery; aligns with existing `@moc/*` packages.  
**Negative:** Requires strict lint boundaries to avoid a “big ball of mud”.  
**Ops:** Scale API and workers independently; single DB initially.

## Alternatives

| Option | Why not (now) |
|--------|----------------|
| Microservices day one | Coordination tax; distributed txs for purchase→royalty |
| Keep Next.js API routes only | Not suited for workers, webhooks, long-term domain growth |
| Other frameworks (Spring, Go) | Team TS already; Nest DI + modules fit hexagonal |
