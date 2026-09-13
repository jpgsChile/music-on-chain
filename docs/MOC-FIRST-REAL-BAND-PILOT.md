# MOC — First Real Band Pilot

<!-- doc-id: MOC-FIRST-REAL-BAND-PILOT -->

| Field | Value |
|-------|-------|
| **Purpose** | Record the first controlled validation of Artist Studio with a real band on the Web3 Trust-Native model. Not a public launch, not Mainnet, not an architecture rewrite. |
| **Dependencies** | [C-BIND](./C-BIND.md) · [Verified Privy session](./MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md) · [Persistent economic ledger](./MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [Web3 Trust-Native domain](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) |
| **Status** | Active |
| **Owner** | Product / Pilot |
| **Last Updated** | 2026-09-13 |
| **Related Documents** | [Documentation Hub](./README.md) · [C-BIND](./C-BIND.md) · [Verified Privy session](./MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING.md) · [Persistent economic ledger](./MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [Product structure](./product-structure.md) · [Upload wizard](./UPLOAD_WIZARD.md) · [Base Sepolia deployment](./MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md) |

---

## Verdict

**STATUS:** READY WITH LIMITATIONS  
**PILOT DECISION:** **B — LISTO PARA PILOTO CONTROLADO** (not C / not production)

A real band authenticated with Privy, bound via C-BIND/1, obtained an ActorRef distinct from `did:privy:…`, completed Artist Profile, and published a real Work / Release / Track / Participation from Studio. Economic ledger simulation and Base Sepolia settlement for **this** catalog were not completed in the same operator session. Those gaps do not rewrite the domain.

Date: 2026-09-13  
Repo: `reconstruction/moc-web3-trust-native-domain`  
Baseline commit at pilot start: `343c279` (`@privy-io/react-auth` 3.39.0)  
Privy server hardening: `2d17a3f`  
C-BIND/1: 1.0.0 · CDR-008: ACCEPTED

---

## Band (non-sensitive)

| Field | Value |
|-------|-------|
| Artistic name | Cleaver |
| Username | `cleaver` |
| Public bio (Studio) | Chilean alternative rock band formed in 2011 (grunge / 90s rock influence). No extra personal data recorded here. |
| ActorRef | `moc:actor:73c5f445-45d4-472e-a017-5b7e224d9d5e` |
| AuthSubject | issuer `privy`; subject is `did:privy:…` (not printed). **≠ ActorRef** |
| Wallet | Public capability attached (42-char address, not printed). **≠ Actor** |

No member emails, tokens, cookies, or secrets in this document.

---

## Flow executed

```text
Google OAuth (Privy)
  → access token
  → server verifyAccessToken()
  → AuthSubject
  → C-BIND/1 Bind (VIGENTE)
  → ActorRef
  → moc_actor_session
  → PUT /api/artist/profile
  → POST /api/releases
  → MusicalWork + MusicRelease + MusicTrack + Participation
```

### Phase results

| Phase | Result | Evidence |
|-------|--------|----------|
| 0 Baseline | PASS | Branch intact; C-BIND pin `1.0.0`; no DB reset |
| 1 Onboarding | PASS | Google OAuth → `POST /api/identity/session` 200; same ActorRef re-issued |
| 2 Actor | PASS | Actor row independent of wallet; Privy subject ≠ ActorRef |
| 3 Artist | PASS | Profile owned by that ActorRef (`artisticName` Cleaver) |
| 4 Work | PASS | `MusicalWork` title **Mirrors** |
| 5 Release | PASS | Single, status PUBLISHED, language Español, Rock / Metal, pricing `download` |
| 6 Track | PASS | Track title `mirrors`, duration 203s, position 0; `workId` ≠ `release.id` ≠ `track.id` |
| 7 Collaborators | PASS (solo) | Studio solo-creator path; no invented members; no wallet required for participation |
| 8 Participation | PASS | Display name Cleaver, role `composer`, 100%, `actorRef` of the band Actor. Participation ≠ wallet |
| 9 Rights | PRODUCT GAP | No `DomainRight` row. Studio/API does not expose `RightsStore.putRight`. Not invented |
| 10–13 Revenue / fees / distribution / entitlements | NOT EXECUTED (this run) | Studio **Regalías** can POST `/api/economics/revenue` (1 USDC = 1_000_000 units, scale 6, `MOC_PRODUCT_FEE_POLICY_V1` 5%). Ledger was empty after publish. Agent browser had no session (401) |
| 14 Simulated settlement | NOT EXECUTED (this run) | Adapter default is `MockExecutionAdapter`. UI copy: “Liquidación simulada (persistida, no on-chain)”. Not clicked after publish |
| 15 Persistence | PASS (catalog) | SQLite `prisma/dev.db`: Actor, profile, work, release, track, participation survive process memory. Economics tables still empty |
| 16 Base Sepolia | TESTNET INFRASTRUCTURE ISSUE | `npm run test:sepolia` failed `CONTRACT_ERROR` (no USDC code at configured address). Not this Work’s settlement. Product catalog still valid |

Trust-Native checks: ActorRef ≠ transactionHash (no tx for this catalog). Listing `tokenId` from the upload wizard is **not** identity.

---

## Catalog facts (from Studio, not hardcoded)

- Work and Release currently share the title **Mirrors** (two aggregates, one wizard field).
- Solo composer 100% — matches the band’s choice in the wizard, not a fictional split.
- Release list price field `priceUsdc` = 2 (upload float). Domain money must stay integer minor units; the simulated ledger uses USDC scale 6.

---

## REAL vs MOCK vs TESTNET

### REAL

Privy authentication · server-side `verifyAccessToken()` · AuthSubject · C-BIND/1 · Actor · ArtistProfile · MusicalWork · MusicRelease · MusicTrack · Participation · Prisma persistence · `moc_actor_session` authorization · `MOC_PRODUCT_FEE_POLICY_V1` (wired, not exercised on this catalog)

### MOCK (available, not used on this catalog)

`MockExecutionAdapter` via `getSettlementAdapter()` · Studio “Simular ingreso” (1 USDC test sale, not fan money) · no live payment rail

### REAL TESTNET (infrastructure, not this band’s settlement)

Base Sepolia `chainId` 84532 · executor `0x0656D65986816A2F4006a2b6C4092Fae3bFfE751` · `MOCSettlement` · `npm run test:sepolia`

---

## Bugs

None found that prevent publishing a real solo work from Studio or binding a Privy user to an Actor.

---

## Product gaps (do not implement in this pilot)

1. **Domain rights have no Studio/API surface.** `RightsStore` exists; publish does not create `DomainRight`. Actor → Participation is recorded; Actor → Right is not.
2. **Music library UI does not list the persisted release title.** `/dashboard/music` counts API tracks but still renders `ArtistTrackConfig` from `getArtistByWallet` mock data, so **Mirrors** is easy to miss after “Obra publicada”.
3. **Work title and Release title are the same wizard field.** Aggregates are distinct in Prisma; the UX does not name them separately.
4. **Upload still carries `tokenId`.** Residual NFT-era field. Must not be treated as Actor or Work identity.
5. **Post-publish invite UX is minimal.** Owner can issue a hashed invite; the collaborator must log in and accept at `/dashboard/join`. Authority/UX beyond that (revocation, email delivery) is not built.
6. **Agent vs artist browser.** The band’s Chrome session published the work; the Cursor automation tab was logged out (401). Operator tooling must not scrape cookies.

Historical Studio simulation `rev:491d03b4-6c6f-4c13-8268-3c76f46cde7d` remains unlinked (`workId`/`releaseId` null). It was **not** rewritten. Later Studio simulations require an owned Work, and Release when one is selected. Mock receipts still use adapter outcome `CONFIRMED` and always stamp `adapter: mock`, `simulated: true`, `onChain: false`.

---

## Future features (out of scope)

ERC-4337 · AA · NFT · tokenization · marketplace · crowdfunding · fan tokens · DAO · Mainnet · escrow · exchange · new identity models · new settlement contracts.

---

## User experience (observed, no architecture change)

| Concept | Observed |
|---------|----------|
| Actor | Not named on the publish success screen. Session is invisible (cookie). Friction: identity language vs “cuenta”. |
| Artist | Channel/profile uses artistic name — understood as the band. |
| Work / Release / Track | Wizard says “Publica una obra” but stores Work+Release+Track. Success: “Tu lanzamiento ya forma parte del catálogo.” Track vs obra is easy to collapse. |
| Participation | Solo path is clear. Band-with-members would need the collaborator step and existing roles only: author, composer, producer, performer. |
| Rights | No Studio step. Band cannot see a Right object. |
| Revenue / Entitlement / Settlement | Exists under Regalías with simulated vs on-chain labels. Not completed after this publish. |
| Simulated vs on-chain | Copy exists (`execSimulated` vs `execConfirmed`). Only useful after the ledger button is used. |

---

## Next operator step (same band, no new architecture)

While logged in as Cleaver: **Artist Studio → Colaboradores** to invite Carlos Concha and Pablo Guzman. Each collaborator signs in with their own Privy identity and accepts. Then **Regalías → Vengeance → Simular ingreso → Liquidar**. Confirm liquidación simulada. Do not reuse historical `rev:491d03b4-…`.

---

## Tests

Recorded 2026-09-13 after this document:

- `npm test` — 150 PASS
- `npm run test:e2e` — 18 PASS
- `npm run typecheck` — PASS
- `npm run build` — PASS
- `npm run test:sepolia` — FAIL `CONTRACT_ERROR` (USDC bytecode empty on the configured Base Sepolia address). Classified **TESTNET INFRASTRUCTURE ISSUE**. Executor `0x0656D65986816A2F4006a2b6C4092Fae3bFfE751` and `chainId` 84532 were read; architecture not changed.

No production / commercial / Mainnet declaration.
