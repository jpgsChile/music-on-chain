# ADR-006 — Alchemy as chain access layer

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-006-alchemy-rpc.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

Reliable Base RPC, webhook-based indexing, and operational tooling are required for settlement reconciliation without running our own nodes day one.

## Decision

Use **Alchemy** as the primary:

- RPC provider for Base  
- Webhook/activity feed for relevant USDC movements  
- Adapter-backed behind `BlockchainPort` / `ChainWebhookPort`  

## Consequences

**Positive:** Faster path to production reliability; clear vendor SLAs.  
**Negative:** Vendor lock-in mitigated by ports — can swap provider later.  
**Rule:** Alchemy payloads never enter domain models.

## Alternatives

| Option | Why not |
|--------|---------|
| Self-hosted nodes | Ops heavy for stage |
| Another RPC vendor | Acceptable substitute later via same ports |
| Polling only | Worse latency/cost for reconciles |
