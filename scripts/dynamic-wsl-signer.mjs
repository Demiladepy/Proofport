/**
 * Dynamic MPC signer sidecar — MUST run on Linux (WSL/VM/Linux host).
 *
 * @dynamic-labs-wallet/node ships native MPC executors for linux/macos only.
 * There is no win32 binary, so Next.js on Windows cannot sign in-process.
 * This sidecar holds the Linux-only SDK and exposes it over localhost so the
 * Next app (Windows or Linux) can make the Dynamic server wallet sign.
 *
 * Start:  npm run mpc:serve                  (from Windows; shells into WSL)
 *         bash scripts/start-dynamic-wsl.sh  (from inside Linux)
 *
 *   GET  /health  -> { ok, ready, signer, address, eth, lastProof }
 *   POST /sign    -> { to?, value?, data? } signs + broadcasts, returns txHash
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
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
const PORT = Number(process.env.DYNAMIC_WSL_SIGNER_PORT ?? 18787);
const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
const SIGN_TIMEOUT_MS = Number(process.env.MPC_SIGN_TIMEOUT_MS ?? 180_000);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC),
});

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

function loadStore() {
  if (!existsSync(STORE)) return null;
  const store = JSON.parse(readFileSync(STORE, "utf8"));
  if (
    store?.mode !== "dynamic" ||
    !store.accountAddress ||
    !store.walletMetadata
  ) {
    return null;
  }
  return store;
}

function lastProof() {
  if (!existsSync(PROOF)) return null;
  try {
    return JSON.parse(readFileSync(PROOF, "utf8"));
  } catch {
    return null;
  }
}

let clientPromise = null;
async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
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
        30_000,
        "authenticateApiToken",
      );
      return client;
    })().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

/** Serialize signing: the wallet has one nonce and MPC rounds are stateful. */
let queue = Promise.resolve();
function enqueue(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function signAndSend({ to, value, data }) {
  const store = loadStore();
  if (!store) throw new Error("no Dynamic wallet in .data/wallet.json");
  const from = store.accountAddress;
  const client = await getClient();

  const preparedTx = await publicClient.prepareTransactionRequest({
    to: to ?? from,
    value: value === undefined ? parseEther("0.000001") : BigInt(value),
    data,
    chain: baseSepolia,
    account: from,
  });

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

  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(RPC),
    account: from,
  });
  const txHash = await walletClient.sendRawTransaction({
    serializedTransaction: signedTx,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  const proof = {
    address: from,
    txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
    chain: "base-sepolia",
    signer: "dynamic_mpc",
    status: receipt.status,
    signedAt: new Date().toISOString(),
  };
  if (receipt.status === "success") {
    mkdirSync(dirname(PROOF), { recursive: true });
    writeFileSync(PROOF, `${JSON.stringify(proof, null, 2)}\n`);
  }
  return proof;
}

/**
 * Readiness must not depend on a live RPC round-trip. The balance is advisory,
 * so it is cached and time-boxed; a slow chain call used to push /health past
 * the caller's timeout and make a healthy signer look offline.
 */
let balanceCache = { eth: "unknown", at: 0 };

async function cachedBalance(address) {
  if (Date.now() - balanceCache.at < 15_000) return balanceCache.eth;
  try {
    const wei = await withTimeout(
      publicClient.getBalance({ address }),
      1500,
      "getBalance",
    );
    balanceCache = { eth: (Number(wei) / 1e18).toString(), at: Date.now() };
  } catch {
    balanceCache = { eth: balanceCache.eth, at: Date.now() };
  }
  return balanceCache.eth;
}

async function health() {
  const store = loadStore();
  if (!store) {
    return {
      ok: true,
      ready: false,
      signer: "dynamic_mpc",
      note: "Signer is up but .data/wallet.json holds no Dynamic wallet.",
    };
  }
  const eth = await cachedBalance(store.accountAddress);
  return {
    ok: true,
    ready: true,
    signer: "dynamic_mpc",
    address: store.accountAddress,
    eth,
    lastProof: lastProof(),
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = createServer((req, res) => {
  const send = (code, body) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const fail = (err) =>
    send(500, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });

  if (req.url === "/health" && req.method === "GET") {
    health()
      .then((body) => send(200, body))
      .catch(fail);
    return;
  }
  if (req.url === "/sign" && req.method === "POST") {
    readBody(req)
      .then((body) => enqueue(() => signAndSend(body)))
      .then((proof) => send(200, { ok: true, ...proof }))
      .catch(fail);
    return;
  }
  send(404, { ok: false, error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `dynamic-mpc signer on 127.0.0.1:${PORT} (platform ${process.platform})`,
  );
});
