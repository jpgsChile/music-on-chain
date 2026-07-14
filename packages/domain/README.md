# `@moc/domain`

Core Protocol — **Domain layer** (pure TypeScript).

## Rules

- No Next.js, React, viem, wagmi, Prisma, or localStorage.
- No I/O. Only entities, value objects, policies, factories, and domain events.
- Application and adapters depend on this package — never the reverse.

## Status

Skeleton + first migrated policy: `validateRoyaltySplits`.
