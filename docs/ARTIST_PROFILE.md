# Artist Profile System

| Field | Value |
|-------|-------|
| **Purpose** | Artist profile / channel domain notes for PoC and evolution toward Identity BC. |
| **Dependencies** | [Documentation Hub](./README.md) · [Standards](./_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Product / Data |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [Hub](./README.md) · [C-BIND/1](./C-BIND.md) · [Data Model Identity](./data-model/01-aggregates.md) · [Architecture Identity](./backend-architecture/02-bounded-contexts.md) |

<!-- doc-id: ARTIST_PROFILE.md -->


Off-chain artist **channel** belongs to a MOC **Actor**. Wallet is an optional capability and public lookup, not identity.

```text
Privy → AuthSubject → C-BIND/1 → Actor
  ├── ArtistProfile (public channel)
  ├── ActorWallet (optional capability)
  └── MusicRelease → MusicTrack + Participation
```

Identity binding is [C-BIND/1](./C-BIND.md). **FUTURE WORK:** legal Work entity, accounting, withdrawals, multi-wallet, collaborator Actor linking after invite.

## Roles: Artist vs Fan

| Role   | Where                | Profile actions                    |
|--------|----------------------|------------------------------------|
| Artist | `/dashboard`         | Edit own profile (PUT), view own  |
| Fan    | `/fan-dashboard`, `/artist/[slug]` | Read-only view of artist profiles |

- **Artist**: Signs in with Privy. Studio session binds AuthSubject → Actor. Channel edit uses `x-actor-ref` (wallet header remains as capability fallback).
- **Fan**: No profile edit. Public read `GET /api/artist/profile/[wallet]` still works for catalog lookup.

## Database schema (Prisma)

`ArtistProfile.actorRef` is the owner Actor. `wallet` is nullable unique lookup, not the identity key.

`ActorWallet` stores payment/mint capability. `MusicRelease` / `MusicTrack` / `Participation` are the music-domain core. Participation is a **revenue share**, not ownership and not a payment.

## API

- `GET/PUT /api/artist/profile` — Owner channel. Headers: `x-actor-ref` (preferred), `x-artist-wallet` (capability / legacy).
- `GET /api/artist/profile/[wallet]` — Public read by wallet lookup.
- `GET/POST /api/releases` — Releases owned by Actor (`x-actor-ref`).
- `GET /api/participations` — Revenue shares for an Actor.

## Setup

1. `DATABASE_URL="file:./dev.db"` in `.env` (SQLite). For production use PostgreSQL.
2. `npx prisma generate && npx prisma db push`
3. Install: `npm install @prisma/client prisma` if not already in package.json.
