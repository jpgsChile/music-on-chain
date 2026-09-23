# Canonical Decision Records

| Field | Value |
|-------|-------|
| **Purpose** | Index of MOC Canonical Decision Records: stable protocol and domain decisions, distinct from replaceable architecture decisions. |
| **Dependencies** | [Documentation Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [C-BIND/1 consumption](../C-BIND.md) · [ADR Index](../backend-architecture/adr/README.md) |
| **Status** | Active |
| **Owner** | Architecture |
| **Last Updated** | 2026-09-23 |
| **Related Documents** | [Hub](../README.md) · [Standards](../_system/STANDARDS.md) · [C-BIND/1](../C-BIND.md) · [ADR Index](../backend-architecture/adr/README.md) · [CDR-009](./CDR-009-fan-economy-reward-protocol.md) |

<!-- doc-id: cdr/README.md -->

## CDR and ADR

A **Canonical Decision Record (CDR)** states what must remain true in the MOC protocol and domain: identity, aggregates, economic meaning, and invariants.

An **Architecture Decision Record (ADR)** states how a replaceable implementation satisfies that canon: frameworks, vendors, chains, custody, and adapters. ADRs live in [backend-architecture/adr/](../backend-architecture/adr/README.md).

A CDR does not select a blockchain, a vault contract, or an agent runtime. Those choices, when needed, become ADRs that must not redefine the CDR.

## Lifecycle

`Proposed` → `Accepted` → `Superseded`

`Proposed` is a draft for review. It is not normative. Acceptance is a separate decision. Publication of a file does not by itself accept it. An accepted CDR states a version. An incompatible change supersedes that version. It does not edit the accepted meaning in place.

## Registry

| ID | Title | Status | Where it lives |
|----|-------|--------|----------------|
| CDR-008 | C-BIND/1 identity binding | Accepted (external contract, release 1.0.0) | Consumed in [C-BIND.md](../C-BIND.md). Pin: [`contracts/c-bind/1/release.json`](../../contracts/c-bind/1/release.json) (`cdr: CDR-008`, historical path `standard/cdr/CDR-008-c-bind-v1.md`). **Not moved into this folder.** |
| [CDR-009](./CDR-009-fan-economy-reward-protocol.md) | MOC Fan Economy & Reward Protocol | **Accepted** · version **1.0.0** · 2026-09-23 | This folder |

CDR-001 through CDR-007 are not defined in this repository. CDR-008 remains the Trust-Native binding contract MOC consumes. Its historical location is unchanged. CDR-009 version 1.0.0 is the first MOC-native CDR stored here. It is the canonical Fan Economy domain contract. ADRs may implement it. They must not change it in silence.
