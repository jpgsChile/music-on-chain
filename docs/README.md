# Documentation Hub

| Field | Value |
|-------|-------|
| **Purpose** | Single entry point for the living documentation system. Every doc under `docs/` must be reachable from here. |
| **Dependencies** | [`_system/STANDARDS.md`](./_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Documentation Steward |
| **Last Updated** | 2026-09-23 |
| **Related Documents** | [Standards](./_system/STANDARDS.md) · [Backend Architecture](./backend-architecture/README.md) · [Data Model](./data-model/README.md) · [Sprints](./sprints/README.md) · [C-BIND/1](./C-BIND.md) · [CDR index](./cdr/README.md) · [Web3 Trust-Native domain](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [On-chain execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Base Sepolia deployment](./MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md) · [Dev/test environments](./MOC-DEVELOPMENT-TEST-ENVIRONMENT-ARCHITECTURE.md) · [Final Trust-Native validation](./MOC-FINAL-END-TO-END-WEB3-TRUST-NATIVE-ARCHITECTURE-VALIDATION.md) · [Persistent economic ledger](./MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION.md) · [Verified Privy session](./MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md) · [First real band pilot](./MOC-FIRST-REAL-BAND-PILOT.md) · [Root README](../README.md) · [Packages](../packages/README.md) |

---

## How to use this system

1. Read [Documentation Standards](./_system/STANDARDS.md) before adding or editing docs.  
2. Find the **canonical** area below — update there instead of creating orphans.  
3. Every change bumps **Last Updated** and keeps **Related Documents** accurate.

---

## Catalog

### System

| Document | Purpose |
|----------|---------|
| [_system/STANDARDS.md](./_system/STANDARDS.md) | Docs-as-code rules, metadata, anti-duplication |

### Architecture & data (production backend)

| Document | Purpose |
|----------|---------|
| [backend-architecture/README.md](./backend-architecture/README.md) | NestJS modular monolith, BCs, ADRs, infra |
| [data-model/README.md](./data-model/README.md) | Domain → PostgreSQL/Prisma canonical model |
| [sprints/README.md](./sprints/README.md) | Sprint index |
| [sprints/sprint-0.md](./sprints/sprint-0.md) | Infrastructure-only Sprint 0 |

### Product & UX (experience layer)

| Document | Purpose |
|----------|---------|
| [product-structure.md](./product-structure.md) | Product IA: Studio, Fan, Marketplace, About |
| [ux-audit.md](./ux-audit.md) | UX/copy audit notes |
| [vc-demo.md](./vc-demo.md) | Demo narrative for stakeholders |
| [ARTIST_PROFILE.md](./ARTIST_PROFILE.md) | Artist profile / channel (PoC + evolution) |
| [C-BIND.md](./C-BIND.md) | C-BIND/1 1.0.0 (CDR-008) consumption: Privy auth vs binding vs Actor |
| [cdr/README.md](./cdr/README.md) | Canonical Decision Records: CDR vs ADR; CDR-008 pin; CDR-009 accepted 1.0.0 |
| [cdr/CDR-009-fan-economy-reward-protocol.md](./cdr/CDR-009-fan-economy-reward-protocol.md) | Accepted Fan Economy & Reward Protocol 1.0.0 (2026-09-23) |
| [MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) | Domain reconstruction: Actor, Work, Participation, Rights semantics |
| [MOC-ECONOMIC-RIGHTS-FOUNDATION.md](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) | Rights, Revenue, Distribution, Entitlement, Settlement, Fees |
| [MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) | Domain vs execution: Intent, Adapter, Receipt, idempotency |
| [MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) | MOCSettlement V1, Base adapter, USDC, replay, receipts |
| [MOC-BASE-ONCHAIN-SETTLEMENT-THREAT-MODEL.md](./MOC-BASE-ONCHAIN-SETTLEMENT-THREAT-MODEL.md) | V1 settlement threats and mitigations |
| [MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md](./MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md) | Base Sepolia controlled deploy, evidence, reconciliation |
| [MOC-BASE-SEPOLIA-RUNBOOK.md](./MOC-BASE-SEPOLIA-RUNBOOK.md) | Repeatable Sepolia deploy and settle steps |
| [MOC-DEVELOPMENT-TEST-ENVIRONMENT-ARCHITECTURE.md](./MOC-DEVELOPMENT-TEST-ENVIRONMENT-ARCHITECTURE.md) | Unit vs local EVM vs fork vs Sepolia; no faucet for daily work |
| [MOC-FINAL-END-TO-END-WEB3-TRUST-NATIVE-ARCHITECTURE-VALIDATION.md](./MOC-FINAL-END-TO-END-WEB3-TRUST-NATIVE-ARCHITECTURE-VALIDATION.md) | Final E2E Trust-Native architecture verdict |
| [MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION.md](./MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION.md) | Prisma economic ledger, verified Actor session, pilot MVP |
| [MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md](./MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md) | Privy access token, server verifyAuth, AuthSubject, moc_actor_session |
| [MOC-FIRST-REAL-BAND-PILOT.md](./MOC-FIRST-REAL-BAND-PILOT.md) | Controlled Studio pilot with a real band (Cleaver / Mirrors) |
| [UPLOAD_WIZARD.md](./UPLOAD_WIZARD.md) | Upload / release wizard notes |

### Domain features (PoC / evolving)

| Document | Purpose |
|----------|---------|
| [ticket-nft-system.md](./ticket-nft-system.md) | Tickets / events |
| [crowdfunding-contract-base.md](./crowdfunding-contract-base.md) | Crowdfunding on Base notes |
| [PR_CORE_SKELETON.md](./PR_CORE_SKELETON.md) | Core Protocol packages PR notes |

### Code packages

| Document | Purpose |
|----------|---------|
| [packages/README.md](../packages/README.md) | `@moc/*` Core Protocol packages |

---

## Canonical ownership (avoid duplicates)

```mermaid
flowchart LR
  HUB[docs/README Hub]
  STD[_system/STANDARDS]
  ARCH[backend-architecture]
  DM[data-model]
  SP[sprints]
  PROD[product-structure / UX]

  HUB --> STD
  HUB --> ARCH
  HUB --> DM
  HUB --> SP
  HUB --> PROD
  ARCH -->|aggregates deep dive| DM
  SP -->|implements| ARCH
  SP -->|schema from| DM
```

---

## Adding a document

Same PR must:

1. Add/update the file with full metadata  
2. Register it in this catalog (or the folder README linked here)  
3. Link at least one **Related Document** back to a hub  

See [Standards — Before creating](./_system/STANDARDS.md#before-creating-a-new-document).
