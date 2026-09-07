# Migration Strategy

| Field | Value |
|-------|-------|
| **Purpose** | Expand/contract migration strategy. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/12-migration-strategy.md -->


## Principles

1. **Expand / contract** — never break running API in one step  
2. Money tables: additive first; destructive only after dual-write window  
3. All migrations are Prisma Migrate in CI; no manual prod DDL without ticket  
4. PoC SQLite (`ArtistProfile`) is **not** auto-migrated — use ETL playbooks  

---

## Phases

### Phase 0 — Bootstrap (empty Postgres)

1. Create PostgreSQL cluster + roles  
2. `CREATE SCHEMA` for each BC (`identity`, `catalog`, …) — Prisma can emit  
3. Apply baseline migration from `docs/data-model/prisma`  
4. Seed platform config only (no fake money)  

### Phase 1 — Identity + Media + Catalog

Bring Studio channel & release writes onto Postgres.  
Dual-read optional from Next PoC during cutover.

### Phase 2 — Collaboration + Commerce + Licensing

Enable checkout path; Feature flag `commerce.postgres=true`.

### Phase 3 — Royalties + Settlement + Outbox

Turn on allocation workers; Circle/Alchemy webhooks in staging first.

### Phase 4 — Decommission PoC stores

Remove SQLite profile / localStorage release demo as sources of truth.

---

## Migration types

| Type | Example | Rule |
|------|---------|------|
| Additive | New column nullable | Deploy anytime |
| Backfill | Populate `net_minor` | Job + then set NOT NULL |
| Rename | `title` → keep old column | Expand-contract |
| Drop | Remove obsolete column | After 2+ releases unused |
| Enum add | New `ReleaseType` | Safe |
| Enum remove | Drop value | Forbidden until zero rows |

---

## Data backfill playbooks

| Source (PoC) | Target | Notes |
|--------------|--------|-------|
| `ArtistProfile` SQLite | `artist_accounts` + `channel_profiles` | Map wallet→authSubject carefully |
| localStorage releases | `releases` + `tracks` | One-off artist import tool |
| mock sales | Do **not** backfill as real ledger | Optional sandbox only |

---

## Rollback

- Prefer forward fixes  
- Restore from PITR for catastrophic money corruption  
- Outbox/ledger never “delete rollback” — compensate with reversing entries  

---

## Partitioning (deferred migrations)

When row counts demand:

| Table | Partition key |
|-------|---------------|
| `ledger_entries` | `RANGE (created_at)` monthly |
| `outbox_messages` | by status + time (archive published) |
| `domain_event_audit` | monthly |
| `tracks` | hash(`artist_id`) or time — decide at 10M+ |

Document each partition change as its own migration ADR.
