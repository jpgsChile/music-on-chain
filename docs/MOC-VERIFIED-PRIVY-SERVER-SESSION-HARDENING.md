# MOC Verified Privy Server-Side Session Hardening

<!-- doc-id: MOC-VERIFIED-PRIVY-SERVER-SESSION-HARDENING -->

| Field | Value |
|-------|-------|
| **Purpose** | Record how MOC authenticates with a real Privy access token, verifies it server-side, derives AuthSubject from verified claims, binds via C-BIND/1, and authorizes APIs with `moc_actor_session`. |
| **Dependencies** | [C-BIND](./C-BIND.md) · [Persistent economic ledger](./MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION.md) · [Web3 Trust-Native domain](./MOC-WEB3-TRUST-NATIVE-DOMAIN-CONVERGENCE.md) |
| **Status** | Active |
| **Owner** | Architecture / Identity |
| **Last Updated** | 2026-09-13 |
| **Related Documents** | [Documentation Hub](./README.md) · [C-BIND](./C-BIND.md) · [Persistent economic ledger](./MOC-PERSISTENT-ECONOMIC-LEDGER-VERIFIED-ACTOR-SESSION.md) · [First real band pilot](./MOC-FIRST-REAL-BAND-PILOT.md) · [Artist Profile](./ARTIST_PROFILE.md) |

---

Privy autentica.
El servidor verifica.
C-BIND vincula.
Actor representa la identidad semántica de MOC.
Wallet es una capability.
La API autoriza usando el Actor derivado del contexto verificado.

(English canonical restatement below.)

> Privy authenticates.
> The server verifies.
> C-BIND binds.
> Actor is MOC’s semantic identity.
> Wallet is a capability.
> APIs authorize using the Actor derived from the verified context.

## 1. Privy authentication

The product login remains Privy (`@privy-io/react-auth` ^3.13.1). After login, the client calls `getAccessToken()` and sends that **access token** to the server.

The client does **not** declare identity. `user.id` is not ActorRef. `authSubject` in a JSON body is ignored for authentication.

## 2. Access token

Authenticated session creation:

```http
POST /api/identity/session
Authorization: Bearer <Privy access token>
```

Optional body fields are non-authoritative (`profileVersion`, `walletAddress` as a capability to attach).

`POST /api/identity/bind` uses the same Bearer token. Binding still follows C-BIND/1; AuthSubject comes from the verified token, not from the body.

## 3. Server verification

Production uses `@privy-io/node` (`PrivyClient`) via `createPrivyNodeVerifier` (`kind: "privy-node"`).

The verifier calls the official SDK:

```ts
privy.utils().auth().verifyAccessToken(accessToken)
```

(`verifyAuthToken` exists in older Privy APIs and is deprecated in this SDK; MOC uses `verifyAccessToken`.)

Verification is **not** `jwt.decode()`, and is **not** trusting `sub` / `iss` / `exp` without signature verification.

After the SDK returns a claim, MOC additionally checks:

- JWT issuer is `privy.io`
- `app_id` matches the configured Privy app

## 4. AuthSubject

From a verified claim:

```text
AuthSubject.issuer  = "privy"          // C-BIND/1 namespace already in use
AuthSubject.subject = verified.user_id  // Privy user id, never ActorRef
```

C-BIND bindings already store issuer `privy`, not JWT `iss` `privy.io`. This mapping is required so Bind/Resolve keep working without changing C-BIND/1.

Rejected as identity authority:

- `request.body.authSubject`
- `proof: { sufficient: true }` without a verified token
- client `user.id`
- `x-actor-ref`

C-BIND still receives `proof: { sufficient: true }` **after** cryptographic verification. That proof does not replace the token; it is the C-BIND/1 sufficiency flag required by the already-accepted contract.

## 5. C-BIND

Unchanged: C-BIND/1, release 1.0.0, CDR-008.

```text
Verified AuthSubject → Bind / provisionThenBind → ActorRef
```

A revoked binding (`REVOCADO`) cannot authenticate. Session resolution re-checks the vigente binding.

## 6. ActorRef

ActorRef is provisioned by MOC and bound by C-BIND. Privy `user_id` never becomes ActorRef.

## 7. moc_actor_session

After Bind, the server issues `moc_actor_session` (httpOnly, `secure` in production, `sameSite=lax`, TTL, hashed at rest). The cookie is a session handle for a **already verified** Actor. It is not a substitute for Privy verification at login.

The JWT is not stored. Only a SHA-256 hash of the session token is persisted.

Subsequent APIs accept the cookie **or** `Authorization: Bearer <moc_actor_session>` — that Bearer is the **MOC session token**, not a Privy JWT.

## 8. API authorization

```text
REQUEST
  → moc_actor_session (cookie or Bearer)
  → active C-BIND binding
  → currentActorRef
  → authorization
```

Protected at minimum:

- `GET /api/identity/session`
- artist profile (owner)
- releases, participations
- economics revenue, entitlements, settlements

`x-actor-ref` and `?actorRef=` cannot select another Actor. Mismatch → 403.

## 9. Client-declared authSubject

Without a valid Privy Bearer, `POST /api/identity/session` returns 401.

With a valid token, a spoofed `authSubject` in the body is ignored.

## 10. x-actor-ref

Never authorizes. If present and different from the session Actor, APIs return 403.

## 11. Mock vs real

| Kind | Where | Meaning |
|------|--------|---------|
| `mock` | `createMockPrivyVerifier` — **tests only** | Token strings such as `valid-token`, `expired`, `tampered`. **Not** verified Privy. |
| `privy-node` | `createPrivyNodeVerifier` — production | Official `verifyAccessToken`. |

Unit tests inject the mock via `setPrivyVerifierForTests`. SDK wiring tests inject a fake `PrivyClient` that still calls `utils().auth().verifyAccessToken` — that proves production wiring, not a live Privy login.

**This document does not claim a live Privy E2E login unless that run is recorded separately.**

## 12. Environment variables

Names only. Never commit secrets.

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Client App ID (and server fallback) |
| `PRIVY_APP_ID` | Optional server App ID override |
| `PRIVY_APP_SECRET` | Server verification (required for `privy-node`) |
| `PRIVY_JWT_VERIFICATION_KEY` | Optional verification key passed to `PrivyClient` |

If App ID or App Secret is missing, session/bind return `503 PRIVY_VERIFIER_UNAVAILABLE`.

## 13. Limitations

- Live browser Privy login is not part of `npm test`.
- `GET /api/identity/resolve` remains a C-BIND resolve lookup (not an acting-as-Actor grant).
- Wallet headers (`x-artist-wallet`) remain capability/lookup, not identity.
- Base Sepolia settlement is independent of this hardening.

## Logging

Domain logs record codes and ActorRef only. Access tokens, JWTs, app secrets, verification keys, and full cookies are not logged.
