import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "dotenv";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";

const ROOT =
  process.env.PROOFPORT_ROOT ??
  "/mnt/c/Users/User/Desktop/summerofbitcoin/proofport";
config({ path: join(ROOT, ".env") });

const STORE = join(ROOT, ".data", "wallet.json");
const PROOF = join(ROOT, ".data", "dynamic-mpc-proof.json");
const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
const logs = [];

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function main() {
  const store = JSON.parse(readFileSync(STORE, "utf8"));
  if (store.mode !== "dynamic" || !store.accountAddress || !store.walletMetadata) {
    throw new Error("No real Dynamic wallet metadata in .data/wallet.json");
  }

  const { DynamicEvmWalletClient } = await import(
    "@dynamic-labs-wallet/node-evm"
  );
  const client = new DynamicEvmWalletClient({
    environmentId: process.env.DYNAMIC_ENVIRONMENT_ID,
    enableMPCAccelerator: false,
  });
  await withTimeout(
    client.authenticateApiToken(
      process.env.DYNAMIC_API_TOKEN ?? process.env.DYNAMIC_AUTH_TOKEN,
    ),
    15000,
    "authenticateApiToken",
  );
  logs.push({ step: "authenticateApiToken", ok: true });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
  const from = store.accountAddress;
  const preparedTx = await publicClient.prepareTransactionRequest({
    to: from,
    value: parseEther("0.000001"),
    chain: baseSepolia,
    account: from,
  });
  logs.push({
    step: "prepareTransactionRequest",
    to: from,
    value: "0.000001",
  });

  const signedTx = await withTimeout(
    client.signTransaction({
      walletMetadata: store.walletMetadata,
      externalServerKeyShares: store.externalServerKeyShares,
      transaction: preparedTx,
      password: process.env.DYNAMIC_WALLET_PASSWORD ?? "proofport-demo-pw",
    }),
    25000,
    "signTransaction",
  );
  logs.push({ step: "signTransaction", ok: true, signedLen: String(signedTx).length });

  const { createWalletClient } = await import("viem");
  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(RPC),
    account: from,
  });
  const txHash = await walletClient.sendRawTransaction({
    serializedTransaction: signedTx,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  logs.push({
    step: "broadcast",
    txHash,
    status: receipt.status,
  });
  if (receipt.status !== "success") {
    throw new Error(`MPC tx reverted: ${txHash}`);
  }
  mkdirSync(dirname(PROOF), { recursive: true });
  writeFileSync(
    PROOF,
    JSON.stringify(
      {
        address: from,
        txHash,
        explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
        signedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        address: from,
        txHash,
        explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
        status: receipt.status,
        logs,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        logs,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
