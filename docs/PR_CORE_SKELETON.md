# PR: Core Protocol skeleton + first Domain migration + Protocol Demo

| Field | Value |
|-------|-------|
| **Purpose** | PR notes for Core Protocol package skeleton; historical delivery record. |
| **Dependencies** | [Documentation Hub](./README.md) · [Standards](./_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Hub](./README.md) · [packages/README](../packages/README.md) · [Architecture](./backend-architecture/README.md) |

<!-- doc-id: PR_CORE_SKELETON.md -->


## Summary

- Introduce monorepo packages: `@moc/domain`, `@moc/ports`, `@moc/application`, `@moc/adapters`, `@moc/shared`, `packages/contracts` (docs).
- Migrate **only** `validateRoyaltySplits` into `@moc/domain` with **re-export** from `lib/artist-profile/types.ts` (no API/UI import changes).
- Add Vitest + parity tests for the policy.
- Add VC-oriented demo at `/protocol` (SDK playground mock, architecture map, Base as first rail).

## Behavior

- Unchanged: profile API validation, upload wizard Step 4, purchase flows, PoC routes.
- New: `/protocol` narrative demo (simulated SDK — not live settlement).

## Test plan

- [ ] `npm test` — validateRoyaltySplits cases pass
- [ ] `npm run build` — Vercel-compatible
- [ ] PUT `/api/artist/profile` with invalid splits → same error strings
- [ ] Upload wizard Step 4 still validates 100%
- [ ] `/protocol` playground runs full flow
- [ ] Home / artist / buy UX unchanged

## Reversible

- Revert PR restores inline `validateRoyaltySplits` and removes packages/demo route.
