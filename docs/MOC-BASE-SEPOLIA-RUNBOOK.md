# MOC — Base Sepolia Runbook

| Field | Value |
|-------|-------|
| **Purpose** | Repeatable steps to deploy MOCSettlement V1 on Base Sepolia, run a minimal settlement, and reconcile — without secrets or prior chat context. |
| **Dependencies** | [Controlled deployment](./MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) |
| **Status** | Active |
| **Owner** | Architecture / Settlement |
| **Last Updated** | 2026-09-07 |
| **Related Documents** | [Hub](./README.md) · [Controlled deployment](./MOC-BASE-SEPOLIA-CONTROLLED-DEPLOYMENT.md) · [Base settlement contract](./MOC-BASE-ONCHAIN-SETTLEMENT-CONTRACT.md) |

<!-- doc-id: MOC-BASE-SEPOLIA-RUNBOOK.md -->

## Preconditions

- Branch: `reconstruction/moc-web3-trust-native-domain`
- Node ≥ 20.9
- A **testnet** executor wallet with ≥ **0.003 ETH** on Base Sepolia
- RPC HTTPS URL for Base Sepolia (do not commit API keys)

Official public RPC (example only; set it in env, do not hardcode in app code): `https://sepolia.base.org`

## 1. Configure RPC

In `.env.local` or `.env` (gitignored):

```bash
BASE_SEPOLIA_RPC_URL=https://YOUR_SEPOLIA_RPC
```

Alias: `MOC_SETTLEMENT_RPC_URL`.

## 2. Configure signer

```bash
BASE_EXECUTOR_PRIVATE_KEY=0xYOUR_TESTNET_KEY
```

Never commit this. Never paste it into docs, tests, or logs.

## 3. Validate chain

The deploy path calls `provider.getChainId()`. It must be **84532**. Mainnet **8453** throws `MAINNET_FORBIDDEN`. Any other id throws `WRONG_CHAIN`.

## 4. Validate balance

Executor native balance must be ≥ `0.003 ETH` on **Base Sepolia** (chainId 84532). Otherwise `GAS_ERROR`.

A connected signer with **0 ETH** still fails here: RPC and chain are valid; there is no gas to deploy.

Fund the executor address (the one printed as `executorAddress`, never the private key) with testnet ETH:

- Faucet list (official): https://docs.base.org/chain/network-faucets
- Confirm on explorer: `https://sepolia.basescan.org/address/<executorAddress>`

Do not send mainnet ETH. Do not use production treasury.

## 5. Deploy

```bash
npm run test:sepolia
```

This compiles `MOCSettlement` + **MockUSDC (TEST ASSET — NOT production USDC)**, deploys both, then runs settlement tests.

## 6. Validate contract

The test reads `VERSION() === MOC-SETTLEMENT-V1`, `executor()`, `asset()`, and `getCode(address) !== 0x`.

Optional env after deploy (addresses only):

```bash
MOC_SETTLEMENT_ADDRESS=0x...
MOC_SETTLEMENT_ASSET=0x...
MOC_SETTLEMENT_EXECUTOR_ADDRESS=0x...
```

`MOC_SETTLEMENT_ASSET` here is the **token address**. Symbol remains `USDC` unless `MOC_SETTLEMENT_ASSET_SYMBOL` is set.

## 7. Adapter

Uses existing `createBaseSettlementAdapterWithSigner` / `SettlementExecutionAdapter`. Do not add a second adapter.

## 8. Test entitlement

Created in-process by the domain: Actor `moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` (not a wallet). Amount `1000` minor units.

## 9. Execute settlement

`EconomicEntitlement` → `SettlementIntent` → `ExecutionRequest` → Base adapter → `MOCSettlement.settle` → ERC-20 transfer to `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (wallet capability).

`requestRef` must equal the input requestRef. `intentRef` stays stable.

## 10. Reconcile

If the first attempt is `SUBMITTED` / `UNKNOWN`, `adapter.reconcile` reads the receipt/event on Sepolia. UNKNOWN is not FAILED.

## 11. Explorer

After a real tx, open:

- `https://sepolia.basescan.org/address/<MOCSettlement>`
- `https://sepolia.basescan.org/tx/<settlementTx>`

Confirm `SettlementExecuted` (intentRef, beneficiary, asset, amount).

## 12. Replay

The same `intentRef` must not pay twice. Domain retry returns the confirmed receipt; a raw second `settle` reverts.

## Safety

| Check | Stop if |
|-------|---------|
| chainId | ≠ 84532 |
| executor | key address ≠ configured executor |
| secrets | key would be logged or committed |
| VERSION | ≠ `MOC-SETTLEMENT-V1` |
| event | does not match the ExecutionRequest |

Logs may include `intentRef`, `requestRef`, `txHash`, `chainId`, `contractAddress`, `status`. Never the private key.
