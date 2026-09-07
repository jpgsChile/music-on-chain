# ADR-008 — Event-driven royalty allocation

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-008-event-driven-royalties.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

A sale must result in license grants and royalty credits without coupling Commerce to Royalties tables. Millions of allocations need retries and idempotency.

## Decision

- `SaleCompleted` (outbox) fans out to Licensing, Royalties, Notification, Search  
- `AllocateSaleRoyaltiesUseCase` is the sole writer of royalty credits from sales  
- Idempotent on `saleId`  
- Split math uses Collaboration `SplitAgreement` + `@moc/domain` validation policies  

## Consequences

**Positive:** Clear finance audit; resilient workers; Studio split animation can call preview API without faking ledger.  
**Negative:** Eventual visibility of balances after sale (seconds) — UI should show “processing” states.  

## Alternatives

| Option | Why not |
|--------|---------|
| Inline allocate in ConfirmPurchase | Violates BC boundaries; brittle txs |
| Fully on-chain split contracts as UX source | Exposes chain; harder UX; still need off-chain ledger for product |
