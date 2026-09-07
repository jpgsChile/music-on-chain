# Indexes, Constraints & Integrity

| Field | Value |
|-------|-------|
| **Purpose** | Indexes, uniques, checks. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/13-indexes-constraints.md -->


## Check constraints (enforce in DB + domain)

| Table | Constraint | Business meaning |
|-------|------------|------------------|
| `split_participants` | `share_bps BETWEEN 0 AND 10000` | Valid share |
| `split_agreements` | App-level SUM=10000 (trigger optional) | **DM-11:** prefer app validate + integration test; optional DB trigger later |
| `listings` | `price_minor >= 0` | No negative price |
| `listings` | `currency = 'USDC'` | Single currency |
| `orders` | `gross_minor >= 0 AND net_minor >= 0` | |
| `orders` | `currency = 'USDC'` | |
| `royalty_accounts` | `pending_minor >= 0 AND available_minor >= 0` | No negative balances |
| `payouts` | `amount_minor > 0` | |
| `tracks` | `position >= 1` | |
| `channel_profiles` | username format via app; UNIQUE in DB | |

Prisma does not express all CHECKs — add SQL in migration:

```sql
ALTER TABLE royalties.royalty_accounts
  ADD CONSTRAINT chk_balances_nonneg
  CHECK (pending_minor >= 0 AND available_minor >= 0);
```

---

## Unique constraints (critical)

| Table | Unique | Why |
|-------|--------|-----|
| `channel_profiles.username` | yes | Public @handle |
| `auth_bindings (provider, subject)` | yes | One binding |
| `orders (buyer_id, idempotency_key)` | yes | Safe retries |
| `payment_attempts.external_ref` | yes (nullable) | Vendor dedupe |
| `royalty_allocations.sale_id` | yes | One allocation per sale |
| `royalty_accounts (beneficiary_kind, beneficiary_id)` | yes | One finance account |
| `payouts.hold_id` | yes | One payout per hold |
| `payouts.external_ref` | yes | Rail dedupe |
| `outbox (type, dedupe_key)` | yes | Exactly-once intent |
| `license_grants (fan, work, entitlement, order)` | yes | Idempotent grant |
| `tracks (release_id, position)` | yes | Order stability |
| `listing_pricing_models (listing_id, model)` | yes | Set semantics |
| `social_links (artist_id, platform)` | yes | One URL per network |

---

## Indexes (query paths)

| Pattern | Index |
|---------|-------|
| Artist catalog | `releases (artist_id, created_at DESC)` |
| Marketplace | `releases (publish_state, published_at DESC)` |
| Seller orders | `orders (seller_id, created_at DESC)` |
| Buyer orders | covered by idempotency + status indexes |
| Fan library | `license_grants (fan_id, status, created_at DESC)` |
| Royalty ledger | `ledger_entries (account_id, created_at DESC)` |
| Timeline | `royalty_payment_timeline (seller_id, occurred_at DESC)` |
| Outbox poll | `outbox_messages (status, available_at)` |
| Payout ops | `payouts (status, created_at)` |

---

## Foreign keys (within BC only)

| Parent | Child | On delete |
|--------|-------|-----------|
| `artist_accounts` | `channel_profiles`, `social_links` | CASCADE |
| `fan_accounts` | `fan_preferences` | CASCADE |
| `releases` | `tracks`, `release_covers` | CASCADE |
| `split_agreements` | `split_participants` | CASCADE |
| `listings` | `listing_pricing_models` | CASCADE |
| `orders` | `order_lines`, `payment_attempts` | **RESTRICT** |
| `royalty_accounts` | `ledger_entries`, `balance_holds` | **RESTRICT** |
| `royalty_allocations` | `allocation_lines` | **RESTRICT** |
| `payouts` | `payout_attempts` | CASCADE |

**Business decision DM-12:** Money graphs use `RESTRICT` so accidental root deletes fail hard.

---

## OCC

Update pattern:

```sql
UPDATE … SET version = version + 1, … WHERE id = $1 AND version = $2
```

Affected: accounts, orders, listings, releases, payouts, royalty_accounts.
