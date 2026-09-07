# Song Upload Wizard – Design

| Field | Value |
|-------|-------|
| **Purpose** | Upload / release wizard notes; product flow maps to Catalog + Collaboration commands. |
| **Dependencies** | [Documentation Hub](./README.md) · [Standards](./_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Product |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Hub](./README.md) · [Data Model Commands](./data-model/05-commands.md) · [product-structure](./product-structure.md) |

<!-- doc-id: UPLOAD_WIZARD.md -->


Multi-step wizard for uploading a song and minting a Song NFT on Avalanche Fuji testnet.

## Component structure

```
SongUploadWizard (container)
├── Stepper (step 1–5 indicators)
├── Step1Upload      (audio file, drag & drop)
├── Step2Metadata    (title, genre, language)
├── Step3AIUsage     (yes/no + optional description)
├── Step4Rights      (default from profile or override; validate 100%)
├── Step5Mint        (confirm + mint button)
└── Nav (Back / Next)
```

- **Reusable**: Each step is a presentational component receiving `value`, `onChange`, `error`, and `t` (translations). The container holds state and passes props.
- **Progressive disclosure**: Only one step is rendered at a time; state is accumulated for the final mint.

## State management strategy

- **Single source of truth**: `SongUploadState` in `types/upload.ts` holds all wizard fields (audio, metadata, AI, rights, mint result).
- **Hook**: `useSongUploadWizard(artistWallet, defaultRoyaltySplits)`:
  - `state`, `update(key, value)`, `errors`, `goNext`, `goBack`, `runMint`, `reset`.
  - Validates on `goNext` and before `runMint`; errors are stored in component state and merged with `getStepErrors()` for display.
- **Default rights**: Loaded from Artist Profile via `useArtistProfile(artistWallet)`. Step 4 can “use profile default” or “override per song”; when overriding, splits are copied from profile so the user can edit. Validation ensures total = 100%.

## Validation (human-readable)

- **Step 1**: File required; type in allowlist (MP3, WAV, OGG, etc.); max 50 MB. Messages: “Selecciona un archivo de audio.”, “Formato no válido…”, “El archivo no puede superar 50 MB.”
- **Step 2**: Title required, max 200 chars. Message: “El título es obligatorio.”
- **Step 4**: At least one split; sum = 100%; each 0–100. Uses `validateRoyaltySplits()` from artist-profile types. Message: “El reparto debe sumar 100%.”
- Errors are keyed by field (`audioFile`, `title`, `royaltySplits`) and shown under the relevant control.

## Smart contract interface

- **Module**: `lib/contracts/songNft.ts`
- **Params**: `MintSongParams { artistAddress, tokenURI, royaltyPercentBps? }`
- **Result**: `MintSongResult { success, txHash?, tokenId?, error? }`
- **Function**: `mintSongNFT(params)` – stub that resolves after 1.5s; replace with `writeContract` when the Song NFT contract is deployed on Avalanche Fuji.
- **Token URI**: Wizard builds a JSON metadata object (name, genre, language, aiUsage, aiUsageDescription, royaltySplits) and passes it as a data URI or IPFS URI to `mintSongNFT`.

## Routes

- **Page**: `app/dashboard/upload/page.tsx` – requires auth and wallet; renders `SongUploadWizard`.
- **Dashboard link**: “Subir canción (NFT)” → `/dashboard/upload`.
