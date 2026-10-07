# MOC — Stellar Trust-Native Certification

| Field | Value |
|-------|-------|
| **Purpose** | Record the certified application-native fan-support path: PostgreSQL remains the economic ledger and Stellar Testnet records verifiable evidence. |
| **Dependencies** | [Documentation Hub](./README.md) · [C-BIND/1](./C-BIND.md) · [Economic & Rights Foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-10-07 |
| **Related Documents** | [Hub](./README.md) · [Root README](../README.md) · [C-BIND/1](./C-BIND.md) · [Domain convergence](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) · [Economic foundation](./MOC-ECONOMIC-RIGHTS-FOUNDATION.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) |

<!-- doc-id: MOC-STELLAR-TRUST-NATIVE-CERTIFICATION.md -->

## Responsibilities

| Concern | Owner |
| --- | --- |
| Identity | ActorRef |
| Authentication | Privy |
| Binding | C-BIND IdentityBinding |
| Economic ledger | PostgreSQL |
| Protocol evidence | Soroban on Stellar Testnet |
| Artist authority | Artist capability |
| Fan authority | Fan capability |
| Closure | Materializer, distinct from artist and fan |
| Evidence row | EconomicChainEvidence |
| Observation | ChainEventObservation |

A Stellar account is a protocol capability. It is not an ActorRef.

## Canonical flow

```text
Human action
→ canonical economic fact
→ protocol materialization
→ event observation
→ verified proof
```

The application path is:

```text
SupportMusic
→ POST /api/fan-economy
→ redeemReward
→ PostgreSQL COMMIT
→ publishIfConfigured
→ materializeRedemption
```

`redeemReward` validates the intent, writes Redemption, EconomicRevenue, and EconomicEntitlement, and commits. It cannot call Soroban. The application calls `publishIfConfigured` only after that function returns. A Stellar failure does not remove the economic record. EconomicChainEvidence does not replace EconomicRevenue. ChainEventObservation does not create Actor, IdentityBinding, Reward, Redemption, Revenue, Entitlement, or Release.

## Authority matrix

| Action | Signer |
| --- | --- |
| commit_reserve | Artist capability |
| authorize_reward | Artist capability |
| redeem | Fan capability |
| lock_redemption | Materializer |

The materializer cannot redeem as the fan or authorize as the artist.

## Certified Testnet evidence

Network: Stellar Testnet. Contract: `CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI`.

S6.4 application-native support:

| Fact | Value |
| --- | --- |
| Redemption | `redeem-b3e4df75-2f1` |
| Revenue | `revenue:redemption:redeem-b3e4df75-2f1` |
| Amount | 1000000 USDC-denominated minor units, scale 6. The contract does not custody USDC. |
| Materialization hash | `a5c9d5a53c8f5e804d3a2e310438073e23a337ab77d557b498799b30506d50d9` |
| Authorize | `e651c75434b6cd372487b80f7e07d1cae0580abb78d481cc0b7e49e1944ee1ab`, ledger 5041381 |
| Redeem | `c7daff8ceb380d76568b32d96fa5c15863780cd98b1762f2a2ca218512ad895d`, ledger 5041382 |
| Lock | `fcb8bb94eec5be7e853c2db3d59a83dbca6a5c7e3c22079e2f33dba6fc3c2119`, ledger 5041383 |

**TESTNET.** Public inspection, not Mainnet:

- Contract: https://stellar.expert/explorer/testnet/contract/CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI
- Lock transaction: https://stellar.expert/explorer/testnet/tx/fcb8bb94eec5be7e853c2db3d59a83dbca6a5c7e3c22079e2f33dba6fc3c2119

Public capabilities: artist `GC6TY6NERUT5GQLXXHWPR2RIKAHMNKJSTK2FBOXWTRNQNMSKYD6ONEFE`, fan `GDW3BMZWIO7NL6M25XLVUBNDNKHKUYOMK7V4EOWFICDOIBZD55O32O6M`, materializer `GASACPYNRZL2TRKPLXKVS3PJX7TVRTOCEWTULPRKBAX2YXJYQZU3PEA7`.

`MOC_TRUST_EXECUTION=soroban` is a server process switch. It is not a client flag and it is not stored as a secret.

## Hackathon release candidate

Certified on 2026-10-07 as `S9C_ISOLATED_HACKATHON_RC_CERTIFIED`.

| Fact | Value |
| --- | --- |
| Source baseline | `ec0a164172827ec0905d7feb6eca92fd9098af14` |
| Deployment | `dpl_8BvxESSUGz1S2iYJrWiXWvGYnN3Y` |
| Release candidate | https://moc-hackathon-rc.vercel.app |
| Public proof | https://moc-hackathon-rc.vercel.app/demo/stellar-proof |

A judge only reads. The deployment has no Stellar signing secrets and no Base executor. Trust execution is off. The settlement adapter is mock. The public page projects persisted certified evidence. PostgreSQL remains the economic ledger. The contract does not custody or transfer USDC. Accrued participation is not completed settlement.

An earlier release attempt was blocked after one accidental read against production, caused by local environment contamination. That attempt wrote nothing to production. The clean-room recertification that followed had no production access and no preproduction access.
