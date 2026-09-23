#!/usr/bin/env bash
# Stellar testnet readiness for the Fan Economy trust contract.
# Does not fund an account, sign, or deploy.
# Official tool: stellar CLI >= 25.2.0
# https://github.com/stellar/stellar-cli
# soroban-sdk 28 requires `stellar contract build` (wasm32v1-none).
# Do not install the apt package named stellar (seqan-apps).
# Do not build with wasm32-unknown-unknown.
set -euo pipefail

network="${STELLAR_NETWORK:-}"
if [ "$network" != "testnet" ]; then
  echo "STELLAR_MAINNET_FORBIDDEN: STELLAR_NETWORK must be testnet" >&2
  exit 1
fi

command_name="${1:-check}"
case "$command_name" in
  check)
    echo "Required: stellar CLI >= 25.2.0"
    if ! command -v stellar >/dev/null 2>&1; then
      echo "STELLAR_CLI_MISSING"
      exit 2
    fi
    stellar --version
    ;;
  build)
    root="$(cd "$(dirname "$0")/.." && pwd)"
    cd "$root/contracts/soroban/fan-economy-trust"
    stellar contract build
    ;;
  *)
    echo "Refusing '$command_name'. This phase does not fund or deploy." >&2
    exit 1
    ;;
esac
