# ADR-012 — API versioning & compatibility

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-012-api-versioning.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

Studio and Fan clients will ship continuously for years. Breaking JSON contracts without a policy causes production incidents.

## Decision

- Public HTTP API under `/v1/...`  
- Additive changes preferred within `v1`  
- Breaking changes require `/v2` and a documented deprecation window (≥ 90 days)  
- Integration events versioned in type name (`commerce.sale_completed.v1`)  
- Presenters own product language mapping (finance terms, no chain leakage)  

## Consequences

**Positive:** Predictable evolution; mobile/web clients can upgrade safely.  
**Negative:** Multiple versions temporarily increase maintenance.  

## Alternatives

| Option | Why not |
|--------|---------|
| Unversioned `/api` | Breaking changes become emergencies |
| GraphQL-only | Possible later; REST clearer for money webhooks & mobile |
