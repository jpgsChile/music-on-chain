# ADR-009 — CQRS-light read models

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-009-cqrs-read-models.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

Artist Studio (royalty engine, analytics) and Fan library need optimized reads. Full event sourcing of all aggregates is premature.

## Decision

Adopt **CQRS-light**:

- Write models = aggregates via repositories  
- Read models / queries = dedicated tables or SQL projections updated by event consumers  
- No requirement that every read goes through the write aggregate  

Examples: royalty timeline projection, fan library list, public channel card, search documents.

## Consequences

**Positive:** Fast Studio/Fan queries; write model stays clean.  
**Negative:** Projection lag; need rebuild tools for projections.  

## Alternatives

| Option | Why not |
|--------|---------|
| Always read aggregates | Expensive joins; poor fan list performance |
| Full event sourcing everywhere | High complexity vs benefit year 1 |
