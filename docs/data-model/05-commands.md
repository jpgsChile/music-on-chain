# Step 5 — Commands

| Field | Value |
|-------|-------|
| **Purpose** | Step 5 — commands per aggregate. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) |
| **Status** | Active |
| **Owner** | Data Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Data Model README](./README.md) · [Architecture](../backend-architecture/README.md) · [Business Decisions](./15-business-decisions.md) · [Hub](../README.md) |

<!-- doc-id: data-model/05-commands.md -->


Commands are **intent**. Each maps to one primary aggregate (unless marked saga).

---

## Identity

| Command | Aggregate | Preconditions | Result |
|---------|-----------|---------------|--------|
| `RegisterArtist` | ArtistAccount | Auth subject unbound | Account + empty channel |
| `RegisterFan` | FanAccount | Auth subject unbound | Fan account |
| `UpdateChannel` | ArtistAccount | Owner | Channel/socials updated |
| `RequestVerification` | ArtistAccount | Not verified | Status → PENDING |

---

## Catalog

| Command | Aggregate | Preconditions | Result |
|---------|-----------|---------------|--------|
| `CreateReleaseDraft` | Release | Artist exists | DRAFT release |
| `AddTrack` | Release | Draft/unpublished rules | Track entity |
| `UpdateTrack` | Release | Not locked fields | Metadata changed |
| `RemoveTrack` | Release | Remains ≥0; publish still needs ≥1 | Removed |
| `SetReleaseCover` | Release | Asset ready | Cover set |
| `PublishRelease` | Release | Tracks+cover+split OK | PUBLISHED + event |
| `UnpublishRelease` | Release | Was published | UNPUBLISHED |

---

## Collaboration

| Command | Aggregate | Preconditions | Result |
|---------|-----------|---------------|--------|
| `CreateSplitAgreement` | SplitAgreement | Shares sum 10000 | Created |
| `ReplaceShares` | SplitAgreement | Editable policy | New participant set |
| `InviteCollaborator` | SplitAgreement | — | Invite pending |
| `AcceptCollaboratorInvite` | SplitAgreement | Valid token | Beneficiary bound |

---

## Commerce

| Command | Aggregate | Preconditions | Result |
|---------|-----------|---------------|--------|
| `CreateListing` | Listing | Work published | Active listing |
| `UpdateListingPrice` | Listing | Owner | Price changed |
| `ArchiveListing` | Listing | Owner | Archived |
| `CreateOrder` | Order | Idempotency key; listing active | CREATED + snapshot |
| `AttachPaymentIntent` | Order | Awaiting payment | PaymentAttempt added |
| `MarkOrderPaid` | Order | Valid payment success | PAID + `SaleCompleted` |
| `CancelOrder` | Order | Not paid | CANCELLED |
| `ExpireOrder` | Order | Timeout | EXPIRED |

---

## Licensing

| Command | Aggregate | Preconditions | Result |
|---------|-----------|---------------|--------|
| `GrantLicenseFromSale` | LicenseGrant | Sale paid; idempotent | ACTIVE grant |
| `RevokeLicense` | LicenseGrant | Admin/policy | REVOKED |
| `EvaluateAccess` | (read/policy) | — | Decision (no write) |

---

## Royalties

| Command | Aggregate | Preconditions | Result |
|---------|-----------|---------------|--------|
| `AllocateSaleRoyalties` | RoyaltyAllocation + Accounts | Unique saleId | Credits pending |
| `ReleasePendingBalances` | RoyaltyAccount | Policy window | pending→available |
| `RequestWithdrawal` | RoyaltyAccount | available ≥ amount | Hold + event |
| `CompleteWithdrawal` | RoyaltyAccount | Payout succeeded | Capture hold |
| `FailWithdrawal` | RoyaltyAccount | Payout failed | Release hold |

---

## Settlement

| Command | Aggregate | Preconditions | Result |
|---------|-----------|---------------|--------|
| `InitiatePayout` | Payout | Withdrawal exists | INITIATED |
| `MarkPayoutSubmitted` | Payout | — | SUBMITTED + externalRef |
| `MarkPayoutSucceeded` | Payout | — | SUCCEEDED |
| `MarkPayoutFailed` | Payout | — | FAILED |
| `ReconcilePayout` | Payout | Webhook/poll | Terminal sync |

---

## Media

| Command | Aggregate | Result |
|---------|-----------|--------|
| `BeginUpload` | UploadSession | Presign metadata |
| `CompleteUpload` | UploadSession → MediaAsset | Asset created |
| `FailUpload` | UploadSession | FAILED |

---

## Command → table write summary

| Command family | Tables touched (typical) |
|----------------|--------------------------|
| Channel update | `artist_accounts`, `channel_profiles`, `social_links` |
| Publish release | `releases`, `tracks`, outbox |
| Mark paid | `orders`, `payment_attempts`, outbox |
| Allocate | `royalty_allocations`, `allocation_lines`, `ledger_entries`, `royalty_accounts` |
| Withdraw | `balance_holds`, `royalty_accounts`, outbox → `payouts` |
