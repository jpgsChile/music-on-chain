# Contracts

Two on-chain surfaces. They are not interchangeable.

## Soroban — fan-economy trust (Stellar Testnet)

Accounting commitment for fan support. Not asset custody, and not the economic ledger.

| | |
| --- | --- |
| Source | [`fan-economy-trust/src/lib.rs`](soroban/fan-economy-trust/src/lib.rs) |
| Tests | [`fan-economy-trust/tests/protocol.rs`](soroban/fan-economy-trust/tests/protocol.rs) |
| Judge command | `cargo test --manifest-path contracts/soroban/fan-economy-trust/Cargo.toml` |
| Certification narrative | [`docs/MOC-STELLAR-TRUST-NATIVE-CERTIFICATION.md`](../docs/MOC-STELLAR-TRUST-NATIVE-CERTIFICATION.md) |

`scripts/s3-canonical-testnet-certification.ts` is **CERTIFICATION ONLY — MAY WRITE TO STELLAR TESTNET**. It is not part of the judge quick start. [`scripts/soroban-testnet.sh`](../scripts/soroban-testnet.sh) only checks the CLI or builds the contract. It does not fund an account or deploy.

## Base — MOCSettlement

Foundry layout for a separate settlement contract. Canonical explanation: [`docs/MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md`](../docs/MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md).

```text
forge test
```

This contract is not the Stellar fan-support proof. Judge-safe local checks for it are `npm run test:e2e`, which uses chain id 31337 and a mock adapter. Do not point those checks at Base Mainnet.
