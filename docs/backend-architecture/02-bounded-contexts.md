# 02 — Bounded Contexts

| Field | Value |
|-------|-------|
| **Purpose** | Bounded contexts and context map. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/02-bounded-contexts.md -->


Each bounded context (BC) is a **semantic boundary**: its own ubiquitous language, aggregates, and persistence schema (logical). NestJS modules mirror BCs 1:1.

---

## Context map (overview)

```
                    ┌─────────────┐
                    │  Identity   │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Catalog   │  │  Commerce  │  │ Licensing  │
    └─────┬──────┘  └──────┬─────┘  └──────▲─────┘
          │                │               │
          │         SaleCompleted ─────────┘
          │                │
          ▼                ▼
    ┌────────────┐  ┌────────────┐
    │ Collaboration│ │  Royalties │
    └────────────┘  └──────┬─────┘
                           │
                           ▼
                    ┌────────────┐
                    │ Settlement │
                    └────────────┘

    Cross-cutting: Notification · Media · Search · Admin · Observability
```

---

## Context catalog

### 1. Identity & Access

**Language:** Account, Artist Profile, Fan Profile, Session, Role, Verification  

**Responsibility:** Who is acting; artist channel public projection; auth subject mapping  

**Does not:** Own track audio, prices, or royalty balances  

**Upstream for:** Almost all BCs (actor id)

---

### 2. Catalog

**Language:** Release, Track, Cover, Genre, PublishState, Version  

**Responsibility:** Creative works metadata lifecycle; publish rules  

**Publishes events:** `ReleasePublished`, `TrackUpdated`, `ReleaseUnpublished`  

**Does not:** Process payments or grants  

---

### 3. Collaboration

**Language:** Collaborator, CreativeRole, SplitAgreement, Invitation  

**Responsibility:** Who shares rights on a work; default and per-release split templates  

**Invariant:** Split agreements sum to 100% (validated via `@moc/domain` policy)  

**Consumed by:** Catalog (at publish), Royalties (at sale)

---

### 4. Commerce

**Language:** Listing, Offer, Order, PaymentIntent, Purchase  

**Responsibility:** Pricing models (stream / download / limited / license), checkout, order state machine  

**Publishes:** `OrderPaid`, `SaleCompleted`  

**Does not:** Allocate royalties (emits event; Royalties reacts)

---

### 5. Licensing

**Language:** LicenseGrant, Entitlement, AccessPolicy, PlaybackSession  

**Responsibility:** What a fan may do after purchase; evaluate access  

**Aligns with:** existing `EvaluateAccessUseCase` / `AccessPolicy`  

**Subscribes:** `SaleCompleted` → create grants  

---

### 6. Royalties (Royalty Engine)

**Language:** Allocation, PendingBalance, AvailableBalance, WithdrawalRequest, LedgerEntry  

**Responsibility:** Finance of splits; balances; withdraw requests  

**This is finance, not chain.**  

**Subscribes:** `SaleCompleted` → allocate  
**Publishes:** `WithdrawalRequested`, `BalancesUpdated`  

---

### 7. Settlement

**Language:** SettlementBatch, Payout, Reconciliation, SettlementStatus  

**Responsibility:** Move USDC to recipients via Circle / Base adapters; reconcile vendor & chain events  

**Downstream of Royalties** — Royalties decides *who/how much*; Settlement executes *rails*  

**Never exposed as “smart contract” to product APIs**

---

### 8. Media

**Language:** Asset, UploadSession, TranscodeJob, Preview, StorageKey, Cid  

**Responsibility:** S3 uploads, derivatives, IPFS pin orchestration  

**Supports:** Catalog  

---

### 9. Notification

**Language:** OutboxMessage, Delivery, Channel (email/push/in-app)  

**Responsibility:** Fan-out of user-visible events  

---

### 10. Search & Discovery (read)

**Language:** SearchDocument, Facet, RankingSignal  

**Responsibility:** Eventual-consistent index for marketplace  

**Source:** Catalog + Commerce events  

---

### 11. Admin & Trust

**Language:** Case, Freeze, Audit, VerificationBadge  

**Responsibility:** Support tools, fraud holds, verification workflow (future badge)

---

## Relationship types

| From → To | Type | Mechanism |
|-----------|------|-----------|
| Identity → others | Upstream / shared kernel (ActorId) | ID references only |
| Catalog → Collaboration | Customer-supplier | Sync API within monolith + events |
| Commerce → Licensing | Partnership | `SaleCompleted` event |
| Commerce → Royalties | Partnership | `SaleCompleted` event |
| Royalties → Settlement | Customer-supplier | Commands + events |
| Catalog → Media | Customer-supplier | Commands |
| All → Notification | OHS | Integration events |

## Anti-corruption

- Circle DTOs never leak into Royalties domain — map in Settlement adapters  
- Alchemy webhook payloads never enter Commerce — ChainIndexer → Settlement/Reconciliation  
- Prisma models never imported by `@moc/domain`
