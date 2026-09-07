# Aggregate Diagram

| Field | Value |
|-------|-------|
| **Purpose** | Mermaid aggregate diagrams. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/09-aggregate-diagram.md -->


## Context map + aggregate roots

```mermaid
flowchart TB
  subgraph Identity
    AA[ArtistAccount]
    FA[FanAccount]
  end

  subgraph Catalog
    REL[Release]
  end

  subgraph Collaboration
    SA[SplitAgreement]
  end

  subgraph Commerce
    LST[Listing]
    ORD[Order]
  end

  subgraph Licensing
    LG[LicenseGrant]
  end

  subgraph Royalties
    RA[RoyaltyAccount]
    RALLOC[RoyaltyAllocation]
  end

  subgraph Settlement
    PO[Payout]
  end

  subgraph Media
    US[UploadSession]
    MA[MediaAsset]
  end

  AA -.->|owns| REL
  AA -.->|owns| SA
  REL -.->|priced by| LST
  SA -.->|used at sale| RALLOC
  FA -.->|buys| ORD
  LST -.->|snapshot in| ORD
  ORD -->|SaleCompleted| LG
  ORD -->|SaleCompleted| RALLOC
  RALLOC --> RA
  RA -->|WithdrawalRequested| PO
  REL -.->|assets| MA
  US --> MA
```

## Release aggregate (internal)

```mermaid
flowchart LR
  REL[Release Root]
  REL --> T1[Track]
  REL --> T2[Track]
  REL --> CV[Cover]
  T1 --> A1[audioAssetId]
  CV --> A2[imageAssetId]
```

## Order aggregate (internal)

```mermaid
flowchart LR
  ORD[Order Root]
  ORD --> OL[OrderLine]
  ORD --> PA[PaymentAttempt]
```

## RoyaltyAccount aggregate (internal)

```mermaid
flowchart LR
  RA[RoyaltyAccount Root]
  RA --> LE[LedgerEntry append-only]
  RA --> H[BalanceHold]
  RA --> BAL[Materialized balances VO]
```

## Sale flow across aggregates

```mermaid
sequenceDiagram
  participant O as Order
  participant Out as Outbox
  participant L as LicenseGrant
  participant A as RoyaltyAllocation
  participant R as RoyaltyAccount
  participant P as Payout

  O->>O: MarkOrderPaid
  O->>Out: SaleCompleted
  Out->>L: GrantLicenseFromSale
  Out->>A: AllocateSaleRoyalties
  A->>R: Credit pending
  R->>R: ReleasePending / RequestWithdrawal
  R->>P: InitiatePayout
  P-->>R: Succeeded / Failed
```
