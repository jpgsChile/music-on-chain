# ADR-007 — Circle as USDC payment rail

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-007-circle-payments.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

Fans need to pay in USDC (and possibly on-ramp); artists/collaborators need withdrawals. Building raw on-chain checkout UX for every user fights the product principle “this is finance, not blockchain.”

## Decision

Use **Circle** as the primary **PaymentRailPort** / payout execution partner for USDC movements, with Base as the settlement network where applicable.

Backend maps Circle states → product states: `processing | available | paid | failed`.

## Consequences

**Positive:** Better UX for money movement; compliance tooling path; webhook-driven finality.  
**Negative:** Fee schedule & KYC constraints; sandbox vs prod differences.  
**Rule:** Royalties BC decides amounts; Settlement BC executes Circle calls.

## Alternatives

| Option | Why not |
|--------|---------|
| Pure on-chain checkout only | High friction for mainstream fans |
| Stripe fiat-only | Misaligned with USDC settlement story (may complement later via ADR) |
| Manual treasury ops | Not scalable to millions of txs |
