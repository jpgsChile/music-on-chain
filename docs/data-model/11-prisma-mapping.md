# Prisma Mapping

| Field | Value |
|-------|-------|
| **Purpose** | Domain to Prisma mapping rules. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/11-prisma-mapping.md -->


Domain aggregates → PostgreSQL via Prisma.

**Location of canonical schema:** [`./prisma/`](./prisma/)  
This is the **production design artifact**. It is not wired to the Next.js SQLite PoC.

## Mapping principles

| Domain | Prisma |
|--------|--------|
| Aggregate root | Table with `id`, `version`, timestamps |
| Entity child | Table with FK to root (`onDelete` per lifecycle rules) |
| VO enum | `enum` |
| Money | `BigInt` minor + `currency` |
| Share | `Int` bps |
| ID-ref cross-BC | `String` / `Uuid` **without** `@relation` to other BC |
| Soft delete | `deleted_at DateTime?` on roots that allow it |
| OCC | `version Int @default(1)` |

## ID strategy

**Business decision DM-10:** All public IDs are **ULID** (or UUIDv7) strings stored as `TEXT`/`CHAR(26)`.  
Prisma field type: `String @id` / `@default(cuid())` replaced in app by ULID generator — schema uses `String @id` without DB uuid default so the application owns ID generation.

For Prisma convenience in migrations we document `@id` as application-assigned.

## File layout

```
docs/data-model/prisma/
  schema.prisma          # generator + datasource
  identity.prisma
  catalog.prisma
  collaboration.prisma
  commerce.prisma
  licensing.prisma
  royalties.prisma
  settlement.prisma
  media.prisma
  ops.prisma
```

When adopting in `apps/api`, copy/symlink into `prisma/schema/` with `postgresql` datasource.
