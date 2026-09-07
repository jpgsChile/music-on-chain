# Music On Chain — Core Protocol

Monorepo packages that evolve the PoC into an Enterprise protocol **without breaking** the Next.js app.

**Related documentation:** [Documentation Hub](../docs/README.md) · [Architecture](../docs/backend-architecture/README.md) · [Data Model](../docs/data-model/README.md) · [Standards](../docs/_system/STANDARDS.md)

| Package | Role |
|---------|------|
| `@moc/domain` | Domain (entities, VOs, policies) |
| `@moc/ports` | Interfaces (BAL + repositories) |
| `@moc/application` | Use cases |
| `@moc/adapters` | Driven adapters (Base first) |
| `@moc/shared` | Shared non-domain helpers |
| `contracts/` | MOCSettlement V1 (see [Base settlement](../docs/MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md)) |

## First migration

`validateRoyaltySplits` lives in `@moc/domain` and is re-exported from `lib/artist-profile/types.ts` so existing imports keep working.
