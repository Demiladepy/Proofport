import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@dynamic-labs-wallet/node-evm",
    "@dynamic-labs-wallet/node",
    "@dynamic-labs-wallet/core",
    "@dynamic-labs-wallet/forward-mpc-client",
    "@evervault/wasm-attestation-bindings",
  ],
};

export default nextConfig;
