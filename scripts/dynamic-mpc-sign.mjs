/**
 * Dynamic MPC signer — MUST run on Linux (WSL/VM/Linux CI).
 *
 * @dynamic-labs-wallet/node ships native MPC executors for linux/macos only
 * (see node_modules/@dynamic-labs-wallet/node/internal/node/native/). There is
 * no win32 binary, so `next dev` on Windows can never produce an MPC signature.
 *
 * Reads creds + wallet metadata from the repo, signs a tiny self-transfer with
 * the Dynamic server wallet, broadcasts it, and writes the receipt to
 * .data/dynamic-mpc-proof.json so MOCKS.md row 8 can cite a real hash.
 *
 *   npm run mpc:sign            (from Windows; shells into WSL)
 *   node scripts/dynamic-mpc-sign.mjs   (from inside Linux)
 */
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
const SIGN_TIMEOUT_MS = Number(process.env.MPC_SIGN_TIMEOUT_MS ?? 180_000);

const t0 = Date.now();
const logs = [];
function step(name, extra = {}) {
  logs.push({ step: name, ms: Date.now() - t0, ...extra });
  console.error(`[${Date.now() - t0}ms] ${name} ${JSON.stringify(extra)}`);
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      );
    }),
  ]);
}

async function main() {
  if (process.platform === "win32") {
    throw new Error(
      "win32: @dynamic-labs-wallet/node has no Windows MPC binary. Run this under WSL/Linux.",
    );
  }
  step("platform", { platform: process.platform, arch: process.arch });

  const store = JSON.parse(readFileSync(STORE, "utf8"));
  if (store.mode !== "dynamic" || !store.accountAddress || !store.walletMetadata) {
    throw new Error(
      `${STORE} holds no Dynamic wallet (mode=${store.mode}). Mint one first.`,
    );
  }
  const from = store.accountAddress;
  step("loadStore", { from, hasKeyShares: Boolean(store.externalServerKeyShares) });

  const { DynamicEvmWalletClient } = await import(
    "@dynamic-labs-wallet/node-evm"
  );
  step("importSdk");

  const client = new DynamicEvmWalletClient({
    environmentId: process.env.DYNAMIC_ENVIRONMENT_ID,
    enableMPCAccelerator: false,
  });
  await withTimeout(
    client.authenticateApiToken(
      process.env.DYNAMIC_API_TOKEN ?? process.env.DYNAMIC_AUTH_TOKEN,
    ),
    30_000,
    "authenticateApiToken",
  );
  step("authenticateApiToken");

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
  const balance = await publicClient.getBalance({ address: from });
  step("balance", { wei: balance.toString() });
  if (balance === 0n) {
    throw new Error(`${from} has 0 ETH on Base Sepolia — fund it before signing.`);
  }

  const preparedTx = await publicClient.prepareTransactionRequest({
    to: from,
    value: parseEther("0.000001"),
    chain: baseSepolia,
    account: from,
  });
  step("prepareTransactionRequest", { nonce: preparedTx.nonce });

  const signedTx = await withTimeout(
    client.signTransaction({
      walletMetadata: store.walletMetadata,
      externalServerKeyShares: store.externalServerKeyShares,
      transaction: preparedTx,
      password: process.env.DYNAMIC_WALLET_PASSWORD ?? "proofport-demo-pw",
    }),
    SIGN_TIMEOUT_MS,
    "signTransaction",
  );
  step("signTransaction", { signedLen: String(signedTx).length });

  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(RPC),
    account: from,
  });
  const txHash = await walletClient.sendRawTransaction({
    serializedTransaction: signedTx,
  });
  step("broadcast", { txHash });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  step("receipt", { status: receipt.status, block: String(receipt.blockNumber) });
  if (receipt.status !== "success") {
    throw new Error(`MPC tx reverted: ${txHash}`);
  }

  const proof = {
    address: from,
    txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
    chain: "base-sepolia",
    signer: "dynamic_mpc",
    signedAt: new Date().toISOString(),
  };
  mkdirSync(dirname(PROOF), { recursive: true });
  writeFileSync(PROOF, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, ...proof, logs }, null, 2));
}

main().catch((err) => {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 6) : undefined,
        logs,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
