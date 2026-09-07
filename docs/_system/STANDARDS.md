# Documentation System Standards

| Field | Value |
|-------|-------|
| **Purpose** | Define how Music On Chain documentation is authored, linked, updated, and validated as a living system (docs-as-code). |
| **Dependencies** | None (root standard). Consumed by every file under `docs/`. |
| **Status** | Active |
| **Owner** | Documentation Steward / Architecture |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Documentation Hub](../README.md) · [Backend Architecture](../backend-architecture/README.md) · [Data Model](../data-model/README.md) · [Sprints](../sprints/README.md) · [Cursor rule](../../.cursor/rules/documentation-system.mdc) |

---

## Non-negotiables

1. **No orphan docs** — every document is reachable from [Documentation Hub](../README.md) and lists **Related Documents**.
2. **Search before write** — before creating a file, search `docs/` for an existing home; **update** when possible.
3. **Reuse concepts** — bounded contexts, aggregates, ports, USDC/Base language come from Architecture + Data Model; do not redefine.
4. **Avoid duplication** — one canonical source per concept; others **link**, they do not copy.
5. **Docs are source code** — reviewed in PRs; broken links fail review; metadata required.

---

## Required metadata (every document)

Every Markdown file under `docs/` (except pure Prisma schema sources) MUST start with this table after the H1 (or include it immediately under the title):

| Field | Value |
|-------|-------|
| **Purpose** | One or two sentences: why this doc exists |
| **Dependencies** | Docs/systems that must be read or exist first (`—` if root) |
| **Status** | `Draft` · `Active` · `Deprecated` · `Superseded by <link>` |
| **Owner** | Role or team (e.g. Architecture, Data, Product, Sprint) |
| **Last Updated** | `YYYY-MM-DD` |
| **Related Documents** | At least one hub link + relevant siblings |

Optional HTML machine tag (for tooling):

```html
<!-- doc-id: path/relative/to/docs/without.md -->
```

---

## Canonical sources (do not fork)

| Concept | Canonical doc |
|---------|----------------|
| System architecture, BCs, ADRs | [`backend-architecture/`](../backend-architecture/README.md) |
| Aggregates detail, Prisma, DM-* decisions | [`data-model/`](../data-model/README.md) |
| Sprint execution | [`sprints/`](../sprints/README.md) |
| Product IA / nav | [`product-structure.md`](../product-structure.md) |
| UX copy principles | [`.cursor/rules/ux-copy.mdc`](../../.cursor/rules/ux-copy.mdc) + [`ux-audit.md`](../ux-audit.md) |
| Core packages overview | [`packages/README.md`](../../packages/README.md) |

If `backend-architecture/03-ddd-aggregates.md` and `data-model/01-aggregates.md` overlap: **Data Model is deeper canonical**; Architecture stays the system view and must link to Data Model.

---

## Before creating a new document

```
1. Search docs/ (and packages/*/README.md) for the topic
2. If a doc exists → update it, bump Last Updated, fix Related Documents
3. If partial overlap → add a section + cross-link; do not create a twin
4. If truly new → add file AND register it in docs/README.md the same PR
5. Link from at least one existing parent (hub or folder README)
```

---

## Status lifecycle

`Draft` → `Active` → `Deprecated` → (optional) delete after grace period  

Superseded docs keep a banner linking to the replacement.

---

## PR checklist (documentation)

- [ ] Metadata table present and `Last Updated` set  
- [ ] Listed in [Documentation Hub](../README.md) or a folder README that the hub lists  
- [ ] Related Documents bidirectional where practical  
- [ ] No new duplicate of Architecture / Data Model concepts  
- [ ] Links resolve (relative paths)  

---

## Tooling

- Catalog: [`docs/README.md`](../README.md)  
- Enforcement for agents: [`.cursor/rules/documentation-system.mdc`](../../.cursor/rules/documentation-system.mdc)  
- Validate catalog coverage: `node scripts/docs-validate.mjs` (when present)
