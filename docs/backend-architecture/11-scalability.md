# 11 — Scalability Playbook

| Field | Value |
|-------|-------|
| **Purpose** | Horizontal scale playbook for target load. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [Architecture README](./README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Architecture README](./README.md) · [Data Model](../data-model/README.md) · [Hub](../README.md) · [Standards](../_system/STANDARDS.md) |

<!-- doc-id: backend-architecture/11-scalability.md -->


Targets: **100K artists · 10M fans · 50M tracks · millions of royalty txs**.

---

## Scale axes

| Axis | Technique |
|------|-----------|
| API QPS | Stateless `api` replicas + LB |
| Background work | `worker` replicas; per-queue concurrency |
| DB reads | Read replica for heavy queries (search admin, analytics) |
| DB writes | Partition + avoid hot single-row contention |
| Media bandwidth | CDN in front of previews/covers |
| Cache | Redis; key TTLs; stampede locks |
| Search | Dedicated OpenSearch/Meilisearch/Typesense (year 1–2) fed by events |
| Settlement | Rate-limit Circle; batch where vendor allows; serialize per account |

---

## Capacity sketch (order of magnitude)

Assumptions are planning aids, not SLAs.

| Workload | Pattern | Notes |
|----------|---------|-------|
| Fan browse | 90%+ cacheable | CDN + Redis |
| Playback auth | EvaluateAccess high QPS | Short cache `access:{fan}:{work}` |
| Purchases | Spiky | Idempotent orders; async allocate |
| Uploads | Artist-heavy bursts | Direct-to-S3; API only issues URLs |
| Royalty allocate | 1 job / sale | Cheap CPU; DB append |
| Withdrawals | Low QPS, high sensitivity | Strong consistency + locks |

---

## Hotspot mitigations

### Popular track / artist pages
- Public projection tables  
- CDN cache with short TTL + purge on publish  

### RoyaltyAccount row contention
- Serialize withdraw + credit with account-level lock or queue group  
- Append ledger entries; update balance in same TX  

### Outbox lag
- Autoscale relay workers  
- Alert if lag > 30s (money) / 2m (search)

### 50M tracks metadata
- Do not SELECT * large catalogs  
- Cursor pagination everywhere  
- Store lyrics/large text in object storage or TOAST-aware columns; avoid unbounded lists in aggregates  

---

## Horizontal scaling checklist

- [ ] No in-memory session affinity required (JWT/session in Redis OK)  
- [ ] File uploads not proxied through API pods  
- [ ] Workers idempotent  
- [ ] Prisma pool sized: `(api_pods + worker_pods) * pool < postgres max`  
- [ ] BullMQ locks work across replicas  
- [ ] Scheduler singleton via Redis lock  

---

## Extraction triggers (modular monolith → services)

Extract a BC when **two or more** hold:

1. Needs different SLO / scaling class  
2. Team owns independent release train  
3. Failure isolation required (Settlement/Payments)  
4. Data volume forces separate DB  

**First likely extract:** Settlement (+ payments webhooks)  
**Second:** Media processing workers  
**Last:** Catalog (until search/indexing outgrows)

Extraction must preserve ports — adapters become remote clients without domain changes.

---

## Multi-region (year 3+)

- Active-passive Postgres first  
- Media multi-region replication  
- Settlement stays single-region treasury initially (compliance)  
- Document in future ADR before implementing  

---

## Load testing gates (before each major launch)

| Scenario | Pass criteria |
|----------|---------------|
| Browse storm | p95 HTML/API within budget with cache warm |
| Purchase spike | Zero duplicate grants/allocations |
| Withdraw storm | No negative balances |
| Reindex | Search lag bounded |

---

## Cost controls

- Lifecycle policies on S3 masters vs previews  
- IPFS pin only published metadata  
- Alchemy compute units budget + webhook filtering  
- Circle fee monitoring per settlement batch
