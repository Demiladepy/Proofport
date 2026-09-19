#!/usr/bin/env bash
# Dynamic MPC signer sidecar. Linux only — the SDK has no win32 MPC binary.
#   From Windows:  npm run mpc:serve
#   From Linux:    bash scripts/start-dynamic-wsl.sh
#
# The SDK is installed into a Linux-native directory (not /mnt/c) because npm
# resolution over the 9p mount is unusably slow.
set -euo pipefail
ROOT="${PROOFPORT_ROOT:-/mnt/c/Users/User/Desktop/summerofbitcoin/proofport}"
SIGNER_HOME="${MPC_SIGNER_HOME:-${HOME}/proofport-mpc}"

if [ ! -d "${SIGNER_HOME}/node_modules/@dynamic-labs-wallet/node-evm" ]; then
  echo "Bootstrapping ${SIGNER_HOME} (Linux-native install of the Dynamic SDK)..."
  mkdir -p "$SIGNER_HOME"
  cp "$ROOT/scripts/mpc-signer-package.json" "$SIGNER_HOME/package.json"
  (cd "$SIGNER_HOME" && npm install --no-audit --no-fund)
fi

cp "$ROOT/scripts/dynamic-wsl-signer.mjs" "$SIGNER_HOME/dynamic-wsl-signer.mjs"
cp "$ROOT/scripts/dynamic-mpc-sign.mjs" "$SIGNER_HOME/dynamic-mpc-sign.mjs"

cd "$SIGNER_HOME"
export PROOFPORT_ROOT="$ROOT"
export DYNAMIC_WSL_SIGNER_PORT="${DYNAMIC_WSL_SIGNER_PORT:-18787}"

# Running this twice used to die with EADDRINUSE, which reads like a broken
# signer when in fact a working one is already serving. Check before binding.
PORT="$DYNAMIC_WSL_SIGNER_PORT"
EXISTING="$(node -e "
fetch('http://127.0.0.1:${PORT}/health', { signal: AbortSignal.timeout(2500) })
  .then(r => r.json())
  .then(j => console.log(j && j.ready ? 'ready' : 'unhealthy'))
  .catch(() => console.log('none'));
" 2>/dev/null || echo none)"

case "$EXISTING" in
  ready)
    echo "Dynamic MPC signer is already running and healthy on 127.0.0.1:${PORT}."
    echo "Nothing to do - leave it up and carry on. (npm run preflight to confirm.)"
    exit 0
    ;;
  unhealthy)
    echo "Something is listening on 127.0.0.1:${PORT} but is not a healthy signer."
    echo "Stop it first:  wsl -e bash -c \"fuser -k ${PORT}/tcp\""
    exit 1
    ;;
esac

exec node "$SIGNER_HOME/dynamic-wsl-signer.mjs"
