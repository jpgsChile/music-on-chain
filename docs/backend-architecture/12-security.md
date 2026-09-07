# 12 — Security & Tenancy

| Field | Value |
|-------|-------|
| **Purpose** | AuthZ, tenancy, money safety. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/12-security.md -->


---

## Identity model

- Experience auth (e.g. Privy) proves control of an auth subject  
- Backend maps `authSubject → ActorId` (Artist and/or Fan roles)  
- Authorization checks **ActorId + role + resource ownership** — not client-supplied wallet strings alone  

---

## Tenancy rules

| Resource | Read | Write |
|----------|------|-------|
| Channel public | Public | Owner artist |
| Release draft | Owner | Owner |
| Order | Buyer + seller (limited fields) | System |
| License grant | Owner fan | System |
| Royalty balances | Account owner (+ artist studio for their agreement) | System |
| Payout details | Owner + admin | System |
| Webhooks | Vendor signatures only | — |

Collaborators see **their** royalty account, not the full company treasury.

---

## Money safety

1. Idempotency on purchase & withdraw  
2. Optimistic versioning on balances  
3. Withdrawal = hold → payout → finalize (no double spend)  
4. Admin freeze flags block withdraw/payout  
5. Dual control for treasury config changes (ops process)  
6. Immutable ledger entries (corrections via reversing entries)  

---

## API security

- TLS everywhere  
- `/v1` authenticated unless explicitly public  
- Rate limits per ActorId + IP (Redis)  
- Webhook routes: signature verification, no user JWT  
- Admin routes: separate role + IP allowlist / SSO  

---

## Data protection

| Class | Examples | Controls |
|-------|----------|----------|
| PII | email, name | encrypt at rest (provider), minimize logs |
| Secrets | API keys | secret manager |
| Media masters | WAV | private S3, short-lived signed URLs |
| Financial | balances, payouts | audit log, restricted admin |

PII retention policies documented with legal (future).

---

## Threat notes (abbreviated)

| Threat | Mitigation |
|--------|------------|
| Replay purchase | Idempotency + single paid state |
| IDOR on royalties | AuthZ on account ownership |
| Webhook forgery | HMAC secrets + timestamp skew |
| SSRF via upload URL | Only presigned S3; no server-side fetch of arbitrary URLs |
| Dependency compromise | Lockfiles, CI audit, minimal adapter surface |

---

## Product language vs security forensics

Clients never need tx hashes.  
**Security/ops logs** retain vendor refs (`circlePaymentId`, `txHash`) for reconciliation and incident response — access-controlled.

---

## Compliance posture (directional)

- USDC settlement audit trail ≥ 7 years for ledger  
- KYC/KYT may be required via Circle / partners for payouts above thresholds — modeled as Settlement policy, not domain pollution in Catalog  

Future ADR when KYC becomes mandatory for launch markets.
