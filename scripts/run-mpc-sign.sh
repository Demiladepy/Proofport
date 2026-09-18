#!/usr/bin/env bash
# One-shot Dynamic MPC signature. Linux only — the SDK has no win32 MPC binary.
#   From Windows:  npm run mpc:sign
#   From Linux:    bash scripts/run-mpc-sign.sh
set -euo pipefail
ROOT="${PROOFPORT_ROOT:-/mnt/c/Users/User/Desktop/summerofbitcoin/proofport}"
SIGNER_HOME="${MPC_SIGNER_HOME:-${HOME}/proofport-mpc}"

if [ ! -d "${SIGNER_HOME}/node_modules/@dynamic-labs-wallet/node-evm" ]; then
  echo "Bootstrapping ${SIGNER_HOME} (Linux-native install of the Dynamic SDK)..."
  mkdir -p "$SIGNER_HOME"
  cp "$ROOT/scripts/mpc-signer-package.json" "$SIGNER_HOME/package.json"
  (cd "$SIGNER_HOME" && npm install --no-audit --no-fund)
fi

cp "$ROOT/scripts/dynamic-mpc-sign.mjs" "$SIGNER_HOME/dynamic-mpc-sign.mjs"
cd "$SIGNER_HOME"
export PROOFPORT_ROOT="$ROOT"
exec node "$SIGNER_HOME/dynamic-mpc-sign.mjs"
