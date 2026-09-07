# 07 — Application Services (Use Cases)

| Field | Value |
|-------|-------|
| **Purpose** | Application services / use case catalog. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/07-application-services.md -->


Application services **orchestrate** aggregates and ports. They are transaction scripts with explicit steps — no HTTP, no Prisma, no vendor SDKs.

Naming: `VerbNounUseCase` (aligns with existing `ConfirmPurchaseUseCase`, `EvaluateAccessUseCase`).

---

## Identity

| Use case | Input | Output | Ports |
|----------|-------|--------|-------|
| `RegisterArtistUseCase` | authSubject, displayName | ArtistAccountId | ArtistRepo, Clock |
| `UpdateChannelUseCase` | artistId, channel patch | Channel projection | ArtistRepo, ObjectStorage (avatar/banner refs) |
| `GetPublicChannelUseCase` | username/slug | Public DTO | ArtistQuery |

---

## Catalog

| Use case | Notes |
|----------|-------|
| `CreateReleaseDraftUseCase` | empty draft owned by artist |
| `AddTrackToReleaseUseCase` | attach media asset id + metadata |
| `SetReleaseCoverUseCase` | media asset ref |
| `PublishReleaseUseCase` | validate cover/tracks/split; emit `ReleasePublished` |
| `UnpublishReleaseUseCase` | soft state change |
| `GetReleaseUseCase` | query |

---

## Collaboration

| Use case | Notes |
|----------|-------|
| `CreateSplitAgreementUseCase` | uses `validateRoyaltySplits` |
| `UpdateSplitAgreementUseCase` | only before publish or via amend policy |
| `AcceptCollaboratorInviteUseCase` | binds payout identity |

---

## Commerce

| Use case | Notes |
|----------|-------|
| `CreateListingUseCase` | price USDC + models |
| `CreateOrderUseCase` | idempotency key; snapshot price |
| `ConfirmPurchaseUseCase` | **existing** — mark paid after payment rail confirms |
| `CancelOrderUseCase` | |
| `GetOrderStatusUseCase` | finance-safe status for UI |

Payment initiation may call `PaymentRailPort.createPaymentIntent` (Circle) inside application via port — never Circle SDK types in signature.

---

## Licensing

| Use case | Notes |
|----------|-------|
| `GrantLicenseFromSaleUseCase` | handler for `SaleCompleted` |
| `EvaluateAccessUseCase` | **existing** |
| `ListFanLibraryUseCase` | |

---

## Royalties

| Use case | Notes |
|----------|-------|
| `AllocateSaleRoyaltiesUseCase` | idempotent on saleId; credit accounts |
| `ReleasePendingBalancesUseCase` | pending → available after settlement window |
| `RequestWithdrawalUseCase` | hold available; emit withdraw requested |
| `GetRoyaltyEngineUseCase` | participants, balances, timeline read model |
| `SimulateSplitPreviewUseCase` | pure domain preview for Studio UI |

---

## Settlement

| Use case | Notes |
|----------|-------|
| `ExecutePayoutUseCase` | SettlementPort / PaymentRailPort |
| `HandleCircleWebhookUseCase` | map → Complete/Fail withdrawal |
| `HandleAlchemyWebhookUseCase` | reconcile on-chain USDC movement |
| `ReconcilePayoutUseCase` | periodic safety net |

---

## Media

| Use case | Notes |
|----------|-------|
| `BeginUploadUseCase` | presigned S3 URL |
| `CompleteUploadUseCase` | enqueue transcode / pin |
| `AttachAssetToTrackUseCase` | catalog link |

---

## Application service template (contract)

```
class SomeUseCase {
  constructor(private readonly ports...) {}

  async execute(cmd: SomeCommand, ctx: ExecutionContext): Promise<Result<T, AppError>> {
    // 1. authorize (policy)
    // 2. load aggregate(s)
    // 3. domain decide
    // 4. persist
    // 5. append outbox events
    // 6. return DTO / id
  }
}
```

`ExecutionContext`: `actorId`, `correlationId`, `idempotencyKey?`.

---

## Transaction boundary policy

- One use case ≈ one DB transaction **unless** documented as saga  
- Outbox rows written in the **same** transaction as aggregate writes  
- Workers run **separate** use cases (`AllocateSaleRoyaltiesUseCase`) with their own idempotency  

---

## Mapping to Nest

Nest providers are **facades**:

```
RoyaltiesFacade.allocateSale(saleId) → AllocateSaleRoyaltiesUseCase.execute(...)
```

Controllers talk only to facades/DTOs.
