import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { config } from "dotenv";

console.log("starting dynamic-wsl-signer");

const ROOT =
  process.env.PROOFPORT_ROOT ??
  "/mnt/c/Users/User/Desktop/summerofbitcoin/proofport";
config({ path: join(ROOT, ".env") });

const STORE = join(ROOT, ".data", "wallet.json");
const PORT = Number(process.env.DYNAMIC_WSL_SIGNER_PORT ?? 18787);
const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  return json.result;
}

let createProc = null;

function startCreate() {
  if (existsSync(STORE)) {
    try {
      const existing = JSON.parse(readFileSync(STORE, "utf8"));
      if (existing?.mode === "dynamic" && existing.accountAddress) {
        return { started: false, existed: true, address: existing.accountAddress };
      }
    } catch {
      /* fall through */
    }
  }
  if (createProc && createProc.exitCode === null) {
    return { started: false, running: true };
  }
  createProc = spawn(
    "node",
    [join(ROOT, "scripts/dynamic-wsl-create.mjs")],
    {
      cwd: ROOT,
      env: process.env,
      stdio: "ignore",
      detached: true,
    },
  );
  createProc.unref();
  return { started: true, running: true };
}

async function health() {
  if (existsSync(STORE)) {
    const wallet = JSON.parse(readFileSync(STORE, "utf8"));
    if (wallet?.mode === "dynamic" && wallet.accountAddress) {
      let eth = "unknown";
      try {
        const hex = await rpc("eth_getBalance", [
          wallet.accountAddress,
          "latest",
        ]);
        eth = (Number(BigInt(hex)) / 1e18).toString();
      } catch {
        /* optional */
      }
      return {
        ok: true,
        ready: true,
        signer: "wsl_mpc",
        address: wallet.accountAddress,
        eth,
      };
    }
  }
  return {
    ok: true,
    ready: false,
    signer: "wsl_mpc",
    note: "Signer is up. POST /create to mint a Dynamic MPC wallet (new address; fund it before it can pay).",
  };
}

const server = createServer((req, res) => {
  const send = (code, body) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.url === "/health" && req.method === "GET") {
    health()
      .then((body) => send(200, body))
      .catch((err) =>
        send(500, {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    return;
  }
  if (req.url === "/create" && req.method === "POST") {
    try {
      send(202, { ok: true, ...startCreate() });
    } catch (err) {
      send(500, {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }
  send(404, { ok: false, error: "not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`dynamic-wsl-signer on 0.0.0.0:${PORT}`);
});
