# MOC — Web3 Trust-Native Domain Convergence

| Field | Value |
|-------|-------|
| **Purpose** | Record the domain reconstruction of Music On Chain as Web3 Trust-Native semantics, prior to Economic & Rights Foundation and on-chain execution. |
| **Dependencies** | [Documentation Hub](./README.md) · [C-BIND/1 consumption](./C-BIND.md) · [Standards](./_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture / Domain |
| **Last Updated** | 2026-10-05 |
| **Related Documents** | [Hub](./README.md) · [C-BIND/1](./C-BIND.md) · [Artist Profile](./ARTIST_PROFILE.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [Product structure](./product-structure.md) · [Stellar certification](./MOC-STELLAR-TRUST-NATIVE-CERTIFICATION.md) |

<!-- doc-id: MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md -->

## Objective

Converge MOC identity, artist, music, and participation so they are **Web3-native in meaning** without implementing blockchain, tokens, smart contracts, or decentralized storage.

```text
WEB3-NATIVE SEMANTICS  →  (this stage)
ON-CHAIN EXECUTION     →  later
```

## Principles

- C-BIND/1 1.0.0 (CDR-008) is consumed, not reimplemented.
- `AuthSubject ≠ Actor ≠ wallet ≠ ArtistProfile`.
- Wallet is a **capability**.
- Privy is **authentication**, not domain identity.
- Prisma/SQLite **persist**; they do not define trust.
- `Work ≠ Release ≠ Track`.
- Participation identifies an Actor (or a pending invite), never a wallet.
- Rights and entitlements are domain concepts, not tokens or transactions.
- UI / localStorage / session are not the source of truth for Actor, Participation, or Rights.

## Changes

- Domain kernel in `lib/domain` (types, invariants, provenance). Persistence adapters remain in `actorWallet.ts` and `releaseRepository.ts`.
- `MusicalWork` mapping in Prisma; a Release materializes a Work.
- Profile writes require `x-actor-ref`. Wallet remains optional lookup.
- Wallet attach / replace / revoke do not create, change, or delete Actor.
- Web3-native tests 1–15 in `lib/domain/web3-native.test.ts`.

## Limits

- Economic & Rights Foundation is **not** implemented (types only: Right, Entitlement, Settlement).
- Blockchain, smart contracts, IPFS/Arweave, tokenization: **not implemented — intentional**.
- Mock marketplace / tickets / crowdfunding / localStorage ownership remain Mock (class C).
- `GET /api/artist/profile/[wallet]` remains a public capability index, not identity.

## Invariants

1. Actor may exist with zero wallets.
2. Attach / replace / revoke wallet does not change `ActorRef`.
3. Participation may exist without a wallet (Actor or pending invite).
4. ArtistProfile identity is `actorRef`.
5. Privy subject is not Actor.
6. Music domain has no chain identity.
7. Right is not a token; entitlement may exist before settlement.
8. Settlement execution layer (on-chain later) does not redefine Actor / Participation / Rights.

## Tests

See `lib/domain/web3-native.test.ts` (tests 1–15), `lib/domain/core.test.ts`, `lib/c-bind/engine.test.ts`.

## Future work

- MOC — Economic & Rights Foundation (entitlements, distribution, fees, settlement).
- On-chain execution / evidence as infrastructure, not as a new identity system.
- Optional later: Postgres persistence mapping without changing these semantics.
- Economic & Rights Foundation: see [MOC-ECONOMIC-RIGHTS-FOUNDATION.md](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md).
