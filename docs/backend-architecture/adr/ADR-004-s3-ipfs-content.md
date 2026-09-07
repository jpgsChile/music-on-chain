# ADR-004 — S3 + IPFS content strategy

| Field | Value |
|-------|-------|
| **Purpose** | Architecture Decision Record — see Context/Decision/Consequences in body. |
| **Dependencies** | [ADR Index](./README.md) · [Architecture README](../README.md) · [Standards](../../_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [ADR Index](./README.md) · [Architecture](../README.md) · [Data Model](../../data-model/README.md) · [Sprint 0](../../sprints/sprint-0.md) |

<!-- doc-id: backend-architecture/adr/ADR-004-s3-ipfs-content.md -->


- **Status:** Accepted  
- **Date:** 2026-07-23  

## Context

50M tracks imply large binary storage. We need private masters, CDN-friendly previews, and optional content-addressed public metadata without making IPFS the durability layer for everything.

## Decision

| Content | Store |
|---------|-------|
| WAV masters, private assets | **S3** (private) |
| Previews, covers | **S3** + CDN |
| Release metadata documents | **IPFS** (CID) + pin; CID recorded in DB |
| DB | Metadata pointers only (keys, CIDs, checksums) |

Uploads use **presigned URLs**; API does not stream multi-100MB files through Nest.

## Consequences

**Positive:** Cost/performance control; clear privacy for masters; verifiable public metadata when needed.  
**Negative:** Two content systems to operate; pin failures need retries.  
**Rule:** Catalog aggregate stores refs, not blobs.

## Alternatives

| Option | Why not |
|--------|---------|
| IPFS for masters | Slow, expensive pinning, weak private ACL |
| Only S3 | Fine for MVP, but product wants addressable public metadata option |
| Store blobs in Postgres | Catastrophic at 50M tracks |
