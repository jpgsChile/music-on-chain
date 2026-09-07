# Step 6 — Domain & Integration Events

| Field | Value |
|-------|-------|
| **Purpose** | Step 6 — domain and integration events. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/06-events.md -->


Events are facts that **already happened**. They drive other BCs via outbox → workers.

---

## Event catalog

### Identity

| Event | Payload (essential) | Consumers |
|-------|---------------------|-----------|
| `ArtistRegistered` | artistId | Analytics |
| `ChannelUpdated` | artistId | Search, CDN purge |
| `VerificationRequested` | artistId | Admin, Notification |

### Catalog

| Event | Payload | Consumers |
|-------|---------|-----------|
| `ReleaseCreated` | releaseId, artistId | — |
| `ReleasePublished` | releaseId, trackIds | Search, Notification |
| `ReleaseUnpublished` | releaseId | Search, Commerce (archive listings job) |
| `TrackAdded` | releaseId, trackId | — |

### Collaboration

| Event | Payload | Consumers |
|-------|---------|-----------|
| `SplitAgreementDefined` | agreementId, releaseId? | Catalog publish gate |
| `CollaboratorAccepted` | agreementId, participantId, actorId | Royalties ensure account |

### Commerce

| Event | Payload | Consumers |
|-------|---------|-----------|
| `OrderCreated` | orderId, buyerId | — |
| `SaleCompleted` | saleId=orderId, buyerId, sellerId, workId, gross, net, splitAgreementId | **Licensing, Royalties, Search, Notification** |
| `OrderCancelled` | orderId | Notification |

### Licensing

| Event | Payload | Consumers |
|-------|---------|-----------|
| `LicenseGranted` | grantId, fanId, workId | Notification, access cache bust |
| `LicenseRevoked` | grantId | access cache bust |

### Royalties

| Event | Payload | Consumers |
|-------|---------|-----------|
| `RoyaltiesAllocated` | saleId, allocationId | Timeline projection, Notification |
| `BalancesReleased` | accountId | Engine cache |
| `WithdrawalRequested` | withdrawalId, accountId, amount | **Settlement** |
| `WithdrawalCompleted` | withdrawalId | Notification, timeline |
| `WithdrawalFailed` | withdrawalId | Notification, UI |

### Settlement

| Event | Payload | Consumers |
|-------|---------|-----------|
| `PayoutSubmitted` | payoutId, externalRef | Ops |
| `PayoutSucceeded` | payoutId | Royalties CompleteWithdrawal |
| `PayoutFailed` | payoutId | Royalties FailWithdrawal |

### Media

| Event | Payload | Consumers |
|-------|---------|-----------|
| `UploadCompleted` | assetId, kind | Catalog attach |
| `AssetPinned` | assetId, cid | Catalog metadata |

---

## Storage of events

| Store | Purpose |
|-------|---------|
| `ops.outbox_messages` | Reliable publish (same TX as write) |
| Optional `ops.event_log` | Long-term business event archive (money-related required) |

**Business decision DM-07:** Money-path events (`SaleCompleted`, royalty & payout events) are retained **≥ 7 years** in an append-only event/audit store.

---

## Idempotency of consumers

| Consumer | Dedupe key |
|----------|------------|
| GrantLicenseFromSale | `saleId + workId + fanId` |
| AllocateSaleRoyalties | `saleId` |
| InitiatePayout | `withdrawalId` |
| Search upsert | `releaseId` + event id (upsert) |

---

## Naming

Integration type strings: `{bc}.{event}.v1`  
Example: `commerce.sale_completed.v1`
