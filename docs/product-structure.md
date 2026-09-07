# Product structure — Music On Chain

| Field | Value |
|-------|-------|
| **Purpose** | Describe product information architecture (Studio, Fan, Marketplace, About) for the experience layer. |
| **Dependencies** | [Documentation Hub](./README.md) · [Standards](./_system/STANDARDS.md) |
| **Status** | Active |
| **Owner** | Product |
| **Last Updated** | 2026-07-23 |
| **Related Documents** | [Hub](./README.md) · [Standards](./_system/STANDARDS.md) · [UX audit](./ux-audit.md) · [Architecture](./backend-architecture/README.md) |

<!-- doc-id: product-structure.md -->


Music On Chain is a **music distribution and direct-to-fan platform**.

The protocol is **internal infrastructure**, visible only under **Who We Are**.

## Navigation

| Label | Route | Role |
| --- | --- | --- |
| Landing | `/` | What the product is |
| Artists | `/artists` | Discover creators |
| Marketplace | `/#marketplace` | Buy licenses / support artists |
| Fan | `/fan-dashboard` | Fan experience |
| Artist Studio | `/dashboard` | Publish, sell, monetize |
| Who We Are | `/about` | Technology behind the platform |
| Support | `/support` | Help |

Legacy `/protocol` redirects to `/about`.

## Visible product surfaces

1. **Artist Studio** — publish works, manage sales, receive revenue  
2. **Fan** — licenses, access, history  
3. **Marketplace** — discovery and purchase  

## Rule

Do **not** expose SDK, Core Protocol, or blockchain terminology in normal product usage.  
Keep that language inside **Who We Are** (`/about`).
