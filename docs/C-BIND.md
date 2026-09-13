# C-BIND/1 consumption (MOC)

| Field | Value |
|-------|-------|
| **Purpose** | Record how Music On Chain consumes the external Trust-Native Identity Binding contract C-BIND/1 without becoming a Trust-Native runtime. |
| **Dependencies** | [Documentation Hub](./README.md) · [Standards](./_system/STANDARDS.md) · [ADR-011](./backend-architecture/adr/ADR-011-identity-tenancy.md) · Pinned artifact [`contracts/c-bind/1/release.json`](../contracts/c-bind/1/release.json) |
| **Status** | Active |
| **Owner** | Architecture / Identity |
| **Last Updated** | 2026-09-13 |
| **Related Documents** | [Hub](./README.md) · [ADR-011](./backend-architecture/adr/ADR-011-identity-tenancy.md) · [Artist Profile](./ARTIST_PROFILE.md) · [Web3 Trust-Native domain](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [Verified Privy session](./MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md) · [Value Objects](./data-model/03-value-objects.md) |

<!-- doc-id: C-BIND.md -->

## Pin

```text
Trust-Native Contract: C-BIND/1
Release:               1.0.0
CDR:                   CDR-008
Consumable artifact:   contracts/c-bind/1/release.json
```

MOC is a **consumer**. Trust-Native does not depend on MOC. MOC does not import Trust-Native as a runtime.

```text
Privy = authentication
C-BIND = binding
MOC = vertical application
```

## Conceptual model

```text
Privy Auth Subject
        │
        ▼
AuthSubject   (issuer + subject)
        │
        │ C-BIND/1 Bind
        ▼
ActorRef      (opaque semantic reference)
        │
        ▼
MOC Actor     (ADR-011 ActorId; Prisma `Actor.actorRef`)
```

Separations:

```text
Privy subject ≠ Actor
Privy subject ≠ Wallet
Wallet ≠ Actor
ActorRef ≠ Wallet
Authentication ≠ Binding
Binding ≠ Authorization
```

`AuthSubject.issuer` in the current product session is the MOC-local namespace `privy`. `AuthSubject.subject` is the Privy user id. A wallet address is **not** AuthSubject and **not** ActorRef.

MOC encodes ActorRef as `moc:actor:<uuid>`. That encoding is a **local representation** of the C-BIND semantic reference. It is not imposed by C-BIND/1.

```text
Actor
 ├── identity binding (C-BIND/1)
 ├── ArtistProfile (public channel)
 ├── ActorWallet (capability)
 └── future economic participation
```

## Operations implemented

| Operation | Where | Notes |
|-----------|--------|--------|
| Provision Actor | `provisionMocActor` | MOC-local. **Not** Bind. |
| `Bind` | `lib/c-bind/engine.ts`, `POST /api/identity/bind` | Requires an existing Actor. Proof sufficiency required. |
| `Resolve` | same engine, `GET /api/identity/resolve` | `VIGENTE` \| `REVOCADO`. `NOT_FOUND` is not a BindingStatus. |
| `Revoke` | engine (not a product screen) | Sets Binding `REVOCADO`. Does not delete Actor, Trust, or Wallet. |
| Session | `POST /api/identity/session` | MOC composition: verify Privy access token, then provision if needed, then Bind. |

Proof `{ sufficient: true }` is the C-BIND/1 sufficiency flag applied **after** server-side Privy `verifyAccessToken`. C-BIND/1 does not impose JWT, OAuth, DID, or VC. Client `authSubject` and `proof` are not identity authority. Canonical verification: [Verified Privy session](./MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md).

## Rules consumed (not redefined)

- Retry of the same BindingContext (`C-BIND/1` + AuthSubject + ActorRef) is idempotent. Retry ≠ rebind.
- An ActorRef has at most one AuthSubject `VIGENTE`. A second vigente AuthSubject is `CONFLICT`. No multi-issuer linking.
- Retry on `REVOCADO` returns `REVOKED` and does not reactivate.
- Bind does not create Actor (`UNKNOWN_ACTOR` if the ref is missing).

## Out of this integration (FUTURE WORK)

- Complete accounting, withdrawals, fee taxonomy
- Legal / registry Work beyond the current domain `MusicalWork`
- Advanced collaborator lifecycle / invite → Actor bind
- Multi-wallet, blockchain settlement, tokenization
