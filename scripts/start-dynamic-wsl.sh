#!/usr/bin/env bash
# Run from Windows: wsl -e bash /mnt/c/Users/User/Desktop/summerofbitcoin/proofport/scripts/start-dynamic-wsl.sh
set -euo pipefail
ROOT="/mnt/c/Users/User/Desktop/summerofbitcoin/proofport"
SIGNER_HOME="${HOME}/proofport-dynamic-signer"
cd "$SIGNER_HOME"
export NODE_PATH="${SIGNER_HOME}/node_modules"
export PROOFPORT_ROOT="$ROOT"
export DYNAMIC_WSL_SIGNER_PORT="${DYNAMIC_WSL_SIGNER_PORT:-18787}"
exec node "$ROOT/scripts/dynamic-wsl-signer.mjs"
