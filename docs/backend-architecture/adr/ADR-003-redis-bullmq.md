# ADR-003 — Redis + BullMQ

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-003-redis-bullmq.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

Media processing, royalty allocation, payouts, notifications, and chain reconciliation must not block HTTP request threads. We need retries, concurrency control, and horizontal workers.

## Decision

- **Redis** for cache, rate limits, distributed locks  
- **BullMQ** on Redis for durable job queues  
- Prefer **separating** cache Redis from queue Redis at production scale  

## Consequences

**Positive:** Proven Node ecosystem; per-queue scaling; delayed/repeatable jobs.  
**Negative:** Redis becomes critical infra — must monitor memory and persistence for queues.  
**Rule:** Money-related enqueue only after transactional outbox (or same-TX outbox relay).

## Alternatives

| Option | Why not |
|--------|---------|
| SQS/Kafka only | Extra vendor complexity early; BullMQ enough for monolith |
| In-process async | Lost on deploy; no horizontal scale |
| Temporal day one | Powerful but heavy for current team stage |
