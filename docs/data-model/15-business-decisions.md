# Business Decisions Log (Data Model)

| Field | Value |
|-------|-------|
| **Purpose** | DM-* business decision log for the data model. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/15-business-decisions.md -->


Every material choice affecting the canonical model.  
Format: **ID — Decision — Rationale — Consequences**.

---

### DM-01 — Track is entity of Release (not separate aggregate)

**Decision:** Tracks belong to the Release aggregate.  
**Rationale:** Matches Studio wizard (release-centric); simpler invariants for publish.  
**Consequences:** Cross-release master reuse requires future promotion to `Track` aggregate + migration.

---

### DM-02 — Shares in basis points

**Decision:** Store `share_bps` INT (0–10000), not floats.  
**Rationale:** Exact royalty math; aligns with `@moc/domain` validation.  
**Consequences:** UI converts to %; must validate sum = 10000.

---

### DM-03 — USDC-only money

**Decision:** `currency` constrained to `USDC`; amounts as minor units (`BigInt`).  
**Rationale:** ADR-005; avoids FX complexity.  
**Consequences:** Multi-currency needs new decision + columns carefully.

---

### DM-04 — Pricing models as join table

**Decision:** `listing_pricing_models` instead of Postgres array-only.  
**Rationale:** Clear uniqueness, easy querying, constraint-friendly.  
**Consequences:** Extra table; trivial cost.

---

### DM-05 — Split required to publish

**Decision:** PublishRelease requires resolvable SplitAgreement (release-scoped or cloned DEFAULT).  
**Rationale:** Every sale must allocate 100%.  
**Consequences:** Wizard Step 3 is not optional for publish.

---

### DM-06 — No cross-BC foreign keys

**Decision:** Cross-context references are ID-refs without DB FK.  
**Rationale:** Bounded context autonomy; future service extraction.  
**Consequences:** Application must validate existence; eventual orphan risk mitigated by events & jobs.

---

### DM-07 — Money events retained ≥ 7 years

**Decision:** Audit/event store for money path long retention.  
**Rationale:** Finance/compliance posture.  
**Consequences:** Storage cost; partitioning required later.

---

### DM-08 — Materialized balances + append-only ledger

**Decision:** `royalty_accounts` holds pending/available/withdrawn_lifetime; ledger is audit.  
**Rationale:** Fast Studio reads; OCC on one row; full history preserved.  
**Consequences:** Reconcile job mandatory; never update ledger rows.

---

### DM-09 — Separate Artist and Fan accounts

**Decision:** No single polymorphic `users` money root; royalty beneficiary is kind+id.  
**Rationale:** Clear tenancy; same human can be both artist and fan.  
**Consequences:** AuthBinding maps subjects to one or more actors.

---

### DM-10 — Application-assigned ULID/UUIDv7 IDs

**Decision:** IDs generated in app, stored as strings.  
**Rationale:** Sortable, merge-friendly, no DB round-trip for id.  
**Consequences:** All use cases must use IdGenerator port.

---

### DM-11 — Split sum enforced primarily in domain

**Decision:** Domain policy validates 100%; DB trigger optional later.  
**Rationale:** Keep invariant language in `@moc/domain`.  
**Consequences:** Never write participants via raw SQL bypassing use case.

---

### DM-12 — RESTRICT deletes on money graphs

**Decision:** Orders/ledger/allocations cannot cascade-erase.  
**Rationale:** Accidental delete must fail.  
**Consequences:** Soft-delete / status transitions only.

---

### DM-13 — Username release grace period

**Decision:** Soft-deleted channel usernames stay reserved for a grace period before reuse.  
**Rationale:** Prevent impersonation squatting.  
**Consequences:** Job frees username after N days (config).

---

### DM-14 — Soft-delete default in repositories

**Decision:** Repositories exclude `deleted_at IS NOT NULL` unless `includeDeleted`.  
**Rationale:** Safety default.  
**Consequences:** Admin tools pass explicit flag.

---

### DM-15 — Published release core immutable

**Decision:** Title/type/identity of a PUBLISHED release do not silently mutate; amendments are explicit future feature.  
**Rationale:** Commercial & legal clarity for buyers.  
**Consequences:** Support may unpublish + new release for corrections.

---

### DM-16 — Product APIs hide chain columns

**Decision:** `chain_tx_hash` / vendor refs exist on settlement tables for ops only.  
**Rationale:** Finance UX principle.  
**Consequences:** Presenters strip forensic fields from `/v1`.

---

### DM-17 — Timeline is a read model

**Decision:** `royalty_payment_timeline` is projected from `SaleCompleted` / allocation events.  
**Rationale:** Studio UX performance; not source of truth.  
**Consequences:** Rebuildable from allocations + orders.

---

### DM-18 — Order snapshots commercial truth

**Decision:** Order/order_line store price & title snapshots.  
**Rationale:** Listing can change later; buyer receipt stable.  
**Consequences:** Extra columns; required at CreateOrder.

---

## Change control

New decisions get `DM-XX` and update this file + affected step docs in the same PR.
