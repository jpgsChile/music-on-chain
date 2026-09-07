# MOC — Base On-chain Settlement Threat Model

| Field | Value |
|-------|-------|
| **Purpose** | Record V1 settlement threats and mitigations for MOCSettlement and the Base adapter. Not a governance document. |
| **Dependencies** | [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) |
| **Status** | Active |
| **Owner** | Architecture / Security |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [Hub](./README.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) · [Execution boundary](./MOC-ONCHAIN-EXECUTION-SETTLEMENT-BOUNDARY.md) · [C-BIND/1](./C-BIND.md) |

<!-- doc-id: MOC-BASE-ONCHAIN-SETTLEMENT-THREAT-MODEL.md -->

## Trust boundary

The **executor** is trusted to submit the instruction that MOC already authorized. The contract enforces: only executor, once per `intentRef`, exact token, non-zero beneficiary/amount, and a successful ERC-20 transfer. The **domain** confirms Settlement only when the adapter verifies the event matches the ExecutionRequest.

A compromised executor can settle the **wrong wallet** for a given `intentRef` (first write wins). V1 accepts this as Option A. Mitigation: host-controlled executor, no frontend “SETTLED”, V2 signed intents.

## Threats and mitigations

| Threat | Mitigation V1 |
|--------|----------------|
| Replay / duplicate pay | On-chain `executed[intentRef]`; second settle reverts |
| Unauthorized settle | `msg.sender == executor` |
| Arbitrary token drain | Immutable `asset`; `token` arg must match; no sweep/rescue |
| Reentrancy | `executed` set before transfer; simple nonReentrant lock |
| Zero address / zero amount | Revert; not marked executed |
| Failed / non-standard ERC-20 | `transferFrom` via low-level call; false or revert → `TransferFailed`; `executed` rolled back |
| Insufficient allowance/balance | Adapter pre-checks; contract reverts without marking executed |
| Event spoofing | Adapter accepts logs only from configured contract address + matching intent/amount/beneficiary/asset |
| Missing event on success receipt | Domain not CONFIRMED (`MISSING_EVENT`) |
| SUBMITTED confused with CONFIRMED | Distinct outcomes; domain settles only on CONFIRMED |
| UNKNOWN treated as FAILED | Adapter returns UNKNOWN; orchestrator reconciles |
| Chain ID confusion | Adapter compares `getChainId()` to config |
| Frontend declares SETTLED | APIs ignore client settlement status; confirmation from adapter |
| Private keys in repo | Not in `.env.example`; signer injected by host; logs omit secrets |
| Wallet = Actor | Domain + adapter reject wallet-as-beneficiary identity |
| tx hash as identity | Hash is `externalRef` evidence only |
| Privy / AuthSubject in contract | Not present |

## Residual risk

Immutable executor cannot rotate if the key is lost (V1 limitation). No on-chain check that `beneficiary` is the Actor’s current wallet — that mapping is MOC’s responsibility before building the ExecutionRequest.
