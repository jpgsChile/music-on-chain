# ADR-011 — Identity & tenancy model

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [C-BIND/1](../../C-BIND.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-011-identity-tenancy.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

Artists, fans, and collaborators need clear authorization. Wallet addresses must not be the primary product identity.

## Decision

- **ActorId** is the internal principal (persisted as `Actor.actorRef`; one Actor concept, not a second identity)
- Auth provider subject (e.g. Privy) is **AuthSubject** (`issuer` + `subject`), bound via **C-BIND/1** release **1.0.0** (CDR-008) to ActorRef — not treated as Actor or Wallet
- Roles: `artist`, `fan`, `collaborator`, `admin` (multi-role allowed)
- Resource access via ownership / grant / account membership checks
- Payout destinations are attributes of royalty accounts — not the user’s login UX

See [C-BIND/1 consumption](../../C-BIND.md). Wallet remains a related resource (e.g. `ArtistProfile.wallet`), not AuthSubject and not ActorRef.  

## Consequences

**Positive:** Matches product language (Account); safer AuthZ; multi-device sessions.  
**Negative:** Migration from any wallet-keyed PoC data must be planned.  

## Alternatives

| Option | Why not |
|--------|---------|
| Wallet-as-primary-key | Brittle UX; poor recovery; leaks chain into product |
| Separate auth per BC | Inconsistent sessions |
