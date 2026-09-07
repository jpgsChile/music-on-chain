# 09 — Event Flow

| Field | Value |
|-------|-------|
| **Purpose** | Domain/integration events, outbox, money flow. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/09-event-flow.md -->


## Goals

- Decouple Commerce → Licensing / Royalties / Search / Notification  
- Guarantee **at-least-once** delivery with **idempotent** handlers  
- Keep chain settlement asynchronous and reconcilable  

---

## Event types

### Domain events

Raised inside aggregates / use cases; persisted via **outbox** in the same DB transaction.

Examples:

- `ReleasePublished`
- `OrderPaid` / `SaleCompleted`
- `RoyaltiesAllocated`
- `WithdrawalRequested`
- `WithdrawalCompleted`
- `LicenseGranted`

### Integration events

Stable contracts for workers and future extracted services (versioned payload).

```json
{
  "type": "commerce.sale_completed.v1",
  "id": "evt_…",
  "occurredAt": "…",
  "correlationId": "…",
  "payload": {
    "saleId": "…",
    "orderId": "…",
    "buyerId": "…",
    "sellerId": "…",
    "workId": "…",
    "grossAmount": { "amount": 10000000, "currency": "USDC" },
    "netDistributable": { "amount": 9500000, "currency": "USDC" },
    "splitAgreementId": "…"
  }
}
```

---

## Transactional outbox

```
[UseCase TX]
  1. Persist aggregate
  2. Insert outbox row (type, payload, dedupeKey)
COMMIT

[Outbox relay worker]
  1. SELECT … FOR UPDATE SKIP LOCKED
  2. Publish to BullMQ / Redis stream
  3. Mark published
```

Dual-write to Redis without outbox is **forbidden** for money-related events.

---

## Canonical money flow

```
Fan Checkout
    │
    ▼
CreateOrder (idempotent)
    │
    ▼
PaymentRailPort (Circle) ──► payment confirmation
    │
    ▼
ConfirmPurchaseUseCase
    │  Order Paid
    │  Outbox: SaleCompleted
    ▼
┌───────────────────────────────────────────┐
│              Event consumers               │
├─────────────────┬─────────────────────────┤
│ Licensing       │ GrantLicenseFromSale    │
│ Royalties       │ AllocateSaleRoyalties   │
│ Search          │ Update popularity       │
│ Notification    │ Notify seller/buyer     │
└─────────────────┴─────────────────────────┘
    │
    ▼ (Royalties)
Pending credits on RoyaltyAccounts
    │
    ▼ (policy window / settlement confirm)
Available balances
    │
    ▼
RequestWithdrawal
    │
    ▼
Settlement.ExecutePayout (Circle / Base USDC)
    │
    ▼
Webhooks (Circle/Alchemy) → CompleteWithdrawal
```

---

## Animated Studio “split visualization”

UI animation is **presentation**. Source of truth remains:

- `SplitAgreement` + `AllocateSaleRoyaltiesUseCase` math  

API may expose `GET /v1/royalties/preview-split?amount=` for Studio (pure calculation).

---

## Idempotency keys

| Flow | Key |
|------|-----|
| Checkout | Client `Idempotency-Key` |
| Sale allocation | `saleId` |
| License grant | `saleId + workId + fanId` |
| Payout | `withdrawalId` |
| Webhook | Vendor event id |

Store processed keys in `idempotency_records` or unique constraints on ledger tables.

---

## Failure & retry

| Stage | Strategy |
|-------|----------|
| Outbox publish | Retry forever with backoff; alert on lag |
| Allocate royalties | Retry; poison queue after N; manual replay |
| Payout submit | Retry with same idempotency; circuit break Circle |
| Webhook handler | Ack only after durable process; duplicate safe |

---

## Ordering

- Per aggregate id: consumers should not require global order  
- For balances: serialize per `RoyaltyAccountId` (BullMQ jobId group / Redis lock)  

---

## Observability

Every event carries `correlationId` from the originating HTTP request.  
Traces: `purchase → sale_completed → allocate → grant → notify`.
