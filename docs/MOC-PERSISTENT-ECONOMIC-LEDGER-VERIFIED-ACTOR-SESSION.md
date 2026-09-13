# MOC Persistent Economic Ledger & Verified Actor Session

<!-- doc-id: MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION -->

| Field | Value |
|-------|-------|
| **Purpose** | Record how MOC left volatile in-memory economic state, wired Prisma as a persistence adapter, and authorized actor-centric APIs through a verified Actor session (not `x-actor-ref`). |
| **Dependencies** | [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [On-chain execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [C-BIND](./C-BIND.md) · [Data Model](./data-model/README.md) · [Dev/test environments](./MOC-DEVELOPMENT-TEST-ENVIRONMENT-ARCHITECTURE.md) |
| **Status** | Active |
| **Owner** | Architecture / Product |
| **Last Updated** | 2026-09-13 |
| **Related Documents** | [Documentation Hub](./README.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [On-chain execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [C-BIND](./C-BIND.md) · [Verified Privy session](./MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md) · [Data Model](./data-model/README.md) |

---

## Problem

The Trust-Native kernel was validated, but the product ledger still lived in process memory (`createMemoryEconomicsStore`). A restart dropped Revenue, Entitlements, and SettlementIntents. Actor-centric APIs trusted the client header `x-actor-ref`. That combination is not a pilot: a Chilean band cannot keep economic meaning across sessions, and anyone could impersonate an ActorRef.

Mock **execution** (no chain, no payment rail) is acceptable for an early pilot. Mock **domain state** is not.

## Architecture

```text
Privy (auth UX)
  → AuthSubject
  → C-BIND/1 Bind
  → ActorRef
  → Verified Actor Session (opaque token, hashed in SQLite)
  → API

Domain (lib/domain)
  → EconomicsStore / ExecutionStore / RightsStore
  → Prisma adapter
  → SQLite (PostgreSQL-substitutable)
```

Prisma is a **persistence adapter**, not domain authority. Domain IDs (`revenueId`, `entitlementId`, `intentRef`, `actorRef`) are stored as row identifiers where they already were; Prisma `cuid()` is not Actor identity. `transactionHash` / `externalRef` remain execution evidence only.

C-BIND/1 is unchanged. Privy `user.id` remains AuthSubject.subject, never ActorRef.

## Persistence model

Reused Prisma models (no parallel ledger):

| Domain | Prisma |
|--------|--------|
| Revenue + fees + distribution inputs | `EconomicRevenue` |
| EconomicEntitlement | `EconomicEntitlement` |
| Settlement + Payment | `EconomicSettlement`, `EconomicPayment` |
| SettlementIntent (`intentRef`) | `SettlementIntent.id` unique per entitlement |
| ExecutionRequest | `ExecutionRequestRecord` |
| SettlementReceipt | `SettlementReceiptRecord` (`externalRef` is evidence) |
| DomainRight | `DomainRight` |
| Verified session | `ActorSession` (`tokenHash` only) |

`putAssessed` writes Revenue + Entitlements in one `$transaction`. Settlement completion writes entitlement status + settlement + payment together.

Idempotency: `revenueId` uniqueness and persisted `intentRef`. Retry ≠ new settlement after process restart.

## Verified session

1. Client authenticates with Privy.
2. `POST /api/identity/session` provisions/binds via C-BIND, then issues `moc_actor_session` (httpOnly cookie). Tests may send `Authorization: Bearer`.
3. Protected APIs call `requireActorSession`: token → hash lookup → **VIGENTE** IdentityBinding for the same issuer/subject/actorRef.
4. `x-actor-ref` never authorizes. If present and different from the session Actor, the API returns 403.

Unauthenticated → 401. Unbound subject → 401 `UNBOUND_SUBJECT`. Revoked binding → 401 `BINDING_REVOKED`. Actor A reading Actor B → 403.

## API authorization

Protected (session required):

- `/api/economics/revenue|entitlements|settlements*`
- `/api/releases`, `/api/participations`
- `/api/artist/profile`
- `GET /api/identity/session` (inspect current Actor)

## Real vs mock boundary

| Component | Development | Initial pilot | Testnet | Production |
|-----------|-------------|---------------|---------|------------|
| Auth (Privy UX) | real | real | real | real |
| C-BIND | real | real | real | real |
| Actor / Artist / Work / Participation | real | real | real | real |
| Rights | real + persisted | real + persisted | real | real |
| Revenue / Entitlement / Intent | real + persisted | real + persisted | real | real |
| Execution | local EVM or mock | **simulated (mock adapter), persisted** | Base Sepolia | Base |
| Payment rail | simulated | simulated unless funded testnet | testnet | real |
| Tokenization / ERC-4337 / marketplace | — | — | — | future |

Studio default adapter is `MockExecutionAdapter` (`metadata.adapter = "mock"`, `simulated: true`). The UI must not label that as on-chain confirmation. `BaseSettlementAdapter` is the real execution path for local EVM / Sepolia.

## Pilot scope

**PILOT MVP (real):** onboarding (Privy + Bind), Actor, Artist profile, Work/Release/Track, collaborators/participation, Rights, Revenue event, fees, distribution, Entitlements, SettlementIntent, restart-safe ledger.

**Simulated:** settlement execution and any external payment until Base Sepolia is funded. Honesty: “Liquidación simulada (persistida, no on-chain)”.

Not in this stage: ERC-4337, tokenization, marketplace, Mainnet, escrow, event sourcing.

## Pilot readiness questions

Answered in the implementation report after tests. The intended gate is: a real band can register, keep Actor independently of wallet, register works and collaborators, persist rights and revenue, keep entitlements across restart, and see simulated settlement without being told a chain payment occurred.

## Tests

| ID | What |
|----|------|
| PERSIST-01..04 | Atomic revenue, duplicate after restart, intentRef idempotency, rights persistence |
| SESSION-01..06 | Allow / cross-actor / no session / unbound / revoked / wallet change |
| ECON-01 | Store port ≠ Prisma models |
| PILOT-01 | Actor → Artist → Work → Participation → Right → Revenue → Entitlement → Intent, reload |

Unit economics and execution tests still use **in-memory** stores. App runtime uses Prisma.

## Migration safety

- SQLite → PostgreSQL: change Prisma datasource; domain types and `EconomicsStore` stay.
- Privy → another auth issuer: new AuthSubject.issuer; ActorRef unchanged.
- Base → another EVM: swap `SettlementExecutionAdapter`; Rights/Revenue/Entitlement unchanged.

## Known limitations

- Privy access-token verification: [Verified Privy session](./MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md).
- Mock execution is the Studio default; Sepolia live settle remains funding-gated.
- Convenience/protocol fee bps are persisted on `EconomicRevenue` to reconstruct policy; events are not re-hydrated.
- Tickets/crowdfunding wallet-first surfaces are out of scope for this stage.
