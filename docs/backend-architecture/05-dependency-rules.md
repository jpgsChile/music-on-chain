# 05 — Dependency Rules

| Field | Value |
|-------|-------|
| **Purpose** | Allowed dependency directions across layers/packages. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/05-dependency-rules.md -->


## Layer cake

```
┌──────────────────────────────────────────┐
│  Interface adapters (HTTP, Webhooks)     │  Nest controllers / guards
├──────────────────────────────────────────┤
│  Application (use cases / services)      │  @moc/application + nest providers
├──────────────────────────────────────────┤
│  Domain                                  │  @moc/domain
├──────────────────────────────────────────┤
│  Ports                                   │  @moc/ports
├──────────────────────────────────────────┤
│  Infrastructure adapters                 │  @moc/adapters + apps/api infra
└──────────────────────────────────────────┘
```

Dependencies point **inward** only.

---

## Import allowlist

| From ↓ / To → | domain | ports | application | adapters | nest platform | prisma |
|---------------|--------|-------|-------------|----------|---------------|--------|
| domain | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| ports | ✓ (types only) | ✓ | ✗ | ✗ | ✗ | ✗ |
| application | ✓ | ✓ | ✓* | ✗ | ✗ | ✗ |
| adapters | ✓ (map only) | ✓ | ✗ | ✓ | △ | ✓ |
| controllers | ✗ direct | ✗ | ✓ | ✗ | ✓ | ✗ |
| workers | ✗ direct | ✗ | ✓ | △ inject | ✓ | ✗ |

\* application may compose other application services **within the same BC**; cross-BC only via published facades or events.

△ adapters may use Nest for DI wiring only in `InfrastructureModule`.

---

## Package dependency graph (monorepo)

```
@moc/domain
    ↑
@moc/ports
    ↑
@moc/application
    ↑
@moc/adapters ─────────────→ external SDKs (Alchemy, Circle, AWS, IPFS)
    ↑
apps/api (NestJS) ──→ @moc/*
apps/worker (NestJS) ──→ @moc/*
```

`apps/web` (Next.js) may call **HTTP APIs only**, not `@moc/application` directly in the browser. Server Components / Route Handlers may use a thin BFF, still not embedding settlement SDKs.

---

## Cross-BC rules

1. **No circular Nest module imports**  
2. Prefer **integration events** over synchronous cross-module writes  
3. If sync query is required (e.g., Commerce needs Release title), use a **read facade** (`CatalogQueryPort`) implemented by Catalog — never reach into Catalog tables from Commerce repositories  
4. Shared IDs only (`ReleaseId`, `ActorId`) — not shared ORM entities  

---

## Enforcement

| Mechanism | Use |
|-----------|-----|
| ESLint `no-restricted-imports` | Ban prisma in domain/application |
| ESLint boundaries plugin / Nx tags | `scope:domain`, `scope:app`, `scope:infra` |
| CI architectural tests | Example: adapters must not be imported by domain |
| PR checklist | Money changes require Royalties + Settlement review |

Suggested package tags:

- `type:domain` · `type:port` · `type:application` · `type:adapter` · `type:app`

---

## Configuration & secrets

- Application may depend on `ConfigPort` (interface)  
- Only infrastructure reads env / Secrets Manager  
- Feature flags via `FeatureFlagPort` — no hardcoding vendor behavior in domain  

---

## Testing dependency rules

| Test type | May use |
|-----------|---------|
| Domain unit | domain only |
| Application unit | domain + in-memory fakes of ports |
| Adapter integration | real or testcontainers (Postgres/Redis) |
| E2E API | running api + worker + deps |

Domain tests must remain runnable without Docker.
