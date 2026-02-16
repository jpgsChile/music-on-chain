# Artist Profile System

Off-chain artist profile keyed by wallet. Reusable across all songs; prepared for future on-chain attestation.

## Roles: Artist vs Fan

| Role   | Where                | Profile actions                    |
|--------|----------------------|------------------------------------|
| Artist | `/dashboard`         | Edit own profile (PUT), view own  |
| Fan    | `/fan-dashboard`, `/artist/[slug]` | Read-only view of artist profiles |

- **Artist**: Signs in with Privy (wallet). Profile form is only shown in **Panel de Artista** (`/dashboard`). API `PUT /api/artist/profile` requires header `x-artist-wallet` (owner wallet).
- **Fan**: No profile edit. Can see artist profile on public artist page and in fan dashboard when viewing artists.

## Database schema (Prisma)

```prisma
model ArtistProfile {
  id                   String   @id @default(cuid())
  wallet               String   @unique   // EIP-55 / lowercase stored
  artisticName         String?
  country              String?
  creativeRoles        String   // JSON array: ["composer", "author", "producer"]
  defaultRoyaltySplits String   // JSON: [{ "role": "composer", "percentage": 50 }]
  attestationHash      String?  // future on-chain attestation
  attestationChainId   Int?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  @@index([wallet])
}
```

- **Primary key**: `wallet` (unique). Stored lowercase for consistent lookup.
- **attestationHash / attestationChainId**: Reserved for future on-chain attestation (e.g. commitment or tx hash).

## API

- `GET /api/artist/profile` — Current artist profile. Header: `x-artist-wallet`.
- `PUT /api/artist/profile` — Upsert profile. Header: `x-artist-wallet`. Body: `{ artisticName?, country?, creativeRoles?, defaultRoyaltySplits? }`. Splits must sum to 100%.
- `GET /api/artist/profile/[wallet]` — Public read by wallet (for artist pages / fans).

## Setup

1. `DATABASE_URL="file:./dev.db"` in `.env` (SQLite). For production use PostgreSQL.
2. `npx prisma generate && npx prisma db push`
3. Install: `npm install @prisma/client prisma` if not already in package.json.
