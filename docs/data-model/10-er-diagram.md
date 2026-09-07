# ER Diagram (PostgreSQL logical)

| Field | Value |
|-------|-------|
| **Purpose** | Logical ER diagram for PostgreSQL. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/10-er-diagram.md -->


Logical ER for the canonical schema. Cross-BC links shown as dotted (ID-ref, no FK).

```mermaid
erDiagram
  ARTIST_ACCOUNTS ||--|| CHANNEL_PROFILES : has
  ARTIST_ACCOUNTS ||--o{ SOCIAL_LINKS : has
  FAN_ACCOUNTS ||--o| FAN_PREFERENCES : has

  ARTIST_ACCOUNTS ||--o{ RELEASES : owns
  RELEASES ||--o{ TRACKS : contains
  RELEASES ||--o| RELEASE_COVERS : has

  ARTIST_ACCOUNTS ||--o{ SPLIT_AGREEMENTS : templates
  SPLIT_AGREEMENTS ||--o{ SPLIT_PARTICIPANTS : has

  RELEASES ||--o{ LISTINGS : offered_as
  LISTINGS ||--o{ LISTING_PRICING_MODELS : models
  FAN_ACCOUNTS ||--o{ ORDERS : places
  ORDERS ||--o{ ORDER_LINES : has
  ORDERS ||--o{ PAYMENT_ATTEMPTS : has

  FAN_ACCOUNTS ||--o{ LICENSE_GRANTS : holds
  ORDERS ||--o{ LICENSE_GRANTS : source

  ACTORS ||--o{ ROYALTY_ACCOUNTS : owns
  ROYALTY_ACCOUNTS ||--o{ LEDGER_ENTRIES : audits
  ROYALTY_ACCOUNTS ||--o{ BALANCE_HOLDS : holds
  ORDERS ||--o| ROYALTY_ALLOCATIONS : allocates
  ROYALTY_ALLOCATIONS ||--o{ ALLOCATION_LINES : splits
  ROYALTY_ACCOUNTS ||--o{ ALLOCATION_LINES : credited

  BALANCE_HOLDS ||--o| PAYOUTS : settles
  PAYOUTS ||--o{ PAYOUT_ATTEMPTS : tries

  ARTIST_ACCOUNTS ||--o{ UPLOAD_SESSIONS : starts
  UPLOAD_SESSIONS ||--o| MEDIA_ASSETS : produces

  OUTBOX_MESSAGES ||--|| OUTBOX_MESSAGES : technical
  IDEMPOTENCY_RECORDS ||--|| IDEMPOTENCY_RECORDS : technical
```

## Table list by schema

| Schema | Tables |
|--------|--------|
| `identity` | `artist_accounts`, `fan_accounts`, `channel_profiles`, `social_links`, `fan_preferences`, `auth_bindings` |
| `catalog` | `releases`, `tracks`, `release_covers` |
| `collaboration` | `split_agreements`, `split_participants` |
| `commerce` | `listings`, `listing_pricing_models`, `orders`, `order_lines`, `payment_attempts` |
| `licensing` | `license_grants` |
| `royalties` | `royalty_accounts`, `ledger_entries`, `balance_holds`, `royalty_allocations`, `allocation_lines`, `royalty_payment_timeline` |
| `settlement` | `payouts`, `payout_attempts` |
| `media` | `upload_sessions`, `media_assets` |
| `ops` | `outbox_messages`, `idempotency_records`, `domain_event_audit` |

## Note on ACTORS

There is no mandatory single `actors` table polymorphic root.  
**Business decision DM-09:** `artist_accounts` and `fan_accounts` are separate; `royalty_accounts.beneficiary_kind + beneficiary_id` references either. Collaborators who are not artists still get a `royalty_accounts` row keyed by participant/actor id issued at invite accept.
