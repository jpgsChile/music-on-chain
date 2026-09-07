# ADR-005 — Base + USDC settlement

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) · [Base settlement contract](../../MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) |

<!-- doc-id: backend-architecture/adr/ADR-005-base-usdc-settlement.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

The platform monetizes in a single clear currency and chain to reduce UX and ops complexity. Users must experience **finance**, not chain mechanics.

## Decision

- Settlement currency: **USDC**  
- Settlement network: **Base**  
- Product APIs expose balances, pending/available, withdraw, settlement status  
- Chain details confined to Settlement/Infrastructure adapters  

No multi-chain or multi-stablecoin in the architecture horizon without a new ADR.

## Consequences

**Positive:** Focused treasury; simpler royalty math; coherent Studio/Fan copy.  
**Negative:** Geographic/payment coverage depends on USDC/Base/Circle availability.  
**Rule:** Never require clients to submit gas parameters or contract ABIs.

## Alternatives

| Option | Why not |
|--------|---------|
| Multi-chain MVP | Explodes support matrix |
| Platform IOU points | Breaks “real money” positioning |
| ETH-denominated | Volatility vs artist expectations |
