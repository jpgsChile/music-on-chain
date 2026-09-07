# Domain Model (Synthesis)

| Field | Value |
|-------|-------|
| **Purpose** | Synthesized ubiquitous language and invariants. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/08-domain-model.md -->


Canonical conceptual model after Steps 1–7.

---

## Ubiquitous language map

| Business phrase | Domain type |
|-----------------|-------------|
| Artist Studio account | `ArtistAccount` |
| Fan account | `FanAccount` |
| Mi Canal | `ChannelProfile` + `SocialLink` |
| Lanzamiento | `Release` |
| Pista | `Track` |
| Colaboradores / split | `SplitAgreement` |
| Precio / oferta | `Listing` |
| Compra | `Order` → `SaleCompleted` |
| Licencia / acceso | `LicenseGrant` |
| Motor de regalías | `RoyaltyAccount` + allocations + timeline |
| Retiro | `RequestWithdrawal` → `Payout` |
| Liquidación USDC | Settlement rail (infra) |

---

## Invariants (global)

1. Split shares always total **10000 bps** when agreement is active  
2. Money is **USDC minor units** only  
3. A paid Order never returns to unpaid  
4. Ledger entries are append-only  
5. Available balance cannot go negative  
6. Published release retains immutable commercial identity (title/type at publish) — corrections via new version/release policy  
7. Cross-BC references are IDs; integrity by application  

---

## Bounded context ownership of data

```
identity.*        → Artist/Fan/Channel
catalog.*         → Release/Track
collaboration.*   → SplitAgreement
commerce.*        → Listing/Order
licensing.*       → LicenseGrant
royalties.*       → Accounts/Ledger/Allocations
settlement.*      → Payouts
media.*           → Assets/Uploads
ops.*             → Outbox/Idempotency/Event audit
```

---

## State machines (summary)

### Release.publishState
`DRAFT → PUBLISHED ⇄ UNPUBLISHED`

### Order.status
`CREATED → AWAITING_PAYMENT → PAID`  
`CREATED|AWAITING_PAYMENT → CANCELLED|EXPIRED`

### RoyaltyAccount balances
credits → `pending` → (release) → `available` → (hold) → withdrawn

### Payout.status
`INITIATED → SUBMITTED → SUCCEEDED|FAILED` → optional `RECONCILED`

---

## See also

- [Aggregate diagram](./09-aggregate-diagram.md)  
- [ER diagram](./10-er-diagram.md)  
- [Business decisions](./15-business-decisions.md)
