# Music On Chain — Core Protocol

Monorepo packages that evolve the PoC into an Enterprise protocol **without breaking** the Next.js app.

| Package | Role |
|---------|------|
| `@moc/domain` | Domain (entities, VOs, policies) |
| `@moc/ports` | Interfaces (BAL + repositories) |
| `@moc/application` | Use cases |
| `@moc/adapters` | Driven adapters (Base first) |
| `@moc/shared` | Shared non-domain helpers |
| `contracts/` | Future Solidity |

## First migration

`validateRoyaltySplits` lives in `@moc/domain` and is re-exported from `lib/artist-profile/types.ts` so existing imports keep working.
