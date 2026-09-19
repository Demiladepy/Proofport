/**
 * Pre-recording / pre-submission audit.
 *
 *   npm run preflight
 *
 * Checks everything that has to be true before the camera rolls, and says
 * plainly which failures block a take and which are only cosmetic. Exits
 * non-zero if any BLOCKER fails, so it is also usable in CI.
 */
import { config } from "dotenv";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

config({ path: join(process.cwd(), ".env") });

const BASE = process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000";
const SIGNER = process.env.DYNAMIC_WSL_SIGNER_URL ?? "http://127.0.0.1:18787";
const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

const MPC_WALLET = "0xa83850ab6e3e15e038ee5f79318c40985ac7ea77";
const EXEC_WALLET = "0x0afc983c15444dfdaad76abf22f1d1053035ae67";
const SWAP_ROUTER = "0x94cc0aac535ccdb3c01d6787d6413c739ae12bc4";
const REPUTATION = "0xac188e1e9d624b346006dfe233290751165f2f16";

const TX = {
  mpcRun: "0x85fd02dd919213773d969ba998aac04533750aa31fc987c0e31e6cd633465d04",
  mpcFirst: "0xd96b57f60add3852d684676343a0528947f380b9fdea65d85661f1b473c8c9e1",
  swap: "0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3",
  attest: "0xd546a412a54646441b33990c3bd91854e6fe65d04ee97ca7eb1a73979c7cdef8",
};

type Severity = "BLOCKER" | "WARN";
type Result = { name: string; ok: boolean; detail: string; severity: Severity };

const results: Result[] = [];

function record(name: string, ok: boolean, detail: string, severity: Severity) {
  results.push({ name, ok, detail, severity });
  const mark = ok ? "PASS" : severity === "BLOCKER" ? "FAIL" : "WARN";
  console.log(`  [${mark}] ${name}\n         ${detail}`);
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  if (json.result == null) throw new Error(`${method}: empty result`);
  return json.result;
}

async function getJson<T>(url: string, ms = 8000): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function eq(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

async function section(title: string, fn: () => Promise<void>) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
  try {
    await fn();
  } catch (err) {
    record(
      title,
      false,
      `section threw: ${err instanceof Error ? err.message : String(err)}`,
      "BLOCKER",
    );
  }
}

async function main() {
  console.log("Proofport preflight");
  console.log(`app=${BASE}  signer=${SIGNER}  rpc=${RPC}`);

  await section("1. Environment", async () => {
    const required = [
      "EXECUTION_AGENT_PRIVATE_KEY|DEMO_AGENT_PRIVATE_KEY",
      "PROOF_AGENT_PRIVATE_KEY",
      "REPUTATION_CONTRACT",
      "BASE_SEPOLIA_RPC_URL",
      "PROOFPORT_BASE_URL",
    ];
    for (const spec of required) {
      const names = spec.split("|");
      const hit = names.find((n) => process.env[n]?.trim());
      record(
        spec,
        Boolean(hit),
        hit ? `set via ${hit}` : `missing — set one of ${names.join(" or ")}`,
        spec === "PROOF_AGENT_PRIVATE_KEY" ? "WARN" : "BLOCKER",
      );
    }
    const dyn = Boolean(
      process.env.DYNAMIC_ENVIRONMENT_ID &&
        (process.env.DYNAMIC_API_TOKEN ?? process.env.DYNAMIC_AUTH_TOKEN),
    );
    record(
      "Dynamic credentials",
      dyn,
      dyn ? "present (needed only for local MPC signing)" : "absent — MPC signer cannot start",
      "WARN",
    );
  });

  await section("2. Dynamic MPC signer (needed for the Dynamic claim on camera)", async () => {
    try {
      const health = await getJson<{
        ready: boolean;
        address?: string;
        eth?: string;
      }>(`${SIGNER}/health`, 4000);
      record(
        "signer reachable and holding a wallet",
        Boolean(health.ready),
        health.ready
          ? `ready at ${health.address} (${health.eth} ETH)`
          : "up but no Dynamic wallet loaded",
        "BLOCKER",
      );
    } catch (err) {
      record(
        "signer reachable",
        false,
        `${err instanceof Error ? err.message : String(err)} — run: npm run mpc:serve`,
        "BLOCKER",
      );
    }
  });

  await section("3. App", async () => {
    try {
      const status = await getJson<{
        dynamic?: { signer?: string; mpcProven?: boolean; note?: string };
      }>(`${BASE}/api/status`);
      const signer = status.dynamic?.signer;
      record(
        "rail reports the MPC signer",
        signer === "dynamic_mpc",
        signer === "dynamic_mpc"
          ? "signer=dynamic_mpc — the Dynamic claim will be on screen"
          : `signer=${signer} — start the signer and reload, or your Dynamic claim is not visible`,
        "BLOCKER",
      );
      record(
        "MPC proven on-chain",
        Boolean(status.dynamic?.mpcProven),
        status.dynamic?.mpcProven
          ? "a prior MPC signature is on record"
          : "no .data/dynamic-mpc-proof.json — run npm run mpc:sign",
        "WARN",
      );
    } catch (err) {
      record(
        "app reachable",
        false,
        `${err instanceof Error ? err.message : String(err)} — run: npm run dev`,
        "BLOCKER",
      );
      return;
    }

    for (const path of ["/", "/proof", "/lender"]) {
      try {
        const res = await fetch(`${BASE}${path}`, {
          signal: AbortSignal.timeout(15_000),
        });
        record(`page ${path}`, res.ok, `HTTP ${res.status}`, "BLOCKER");
      } catch (err) {
        record(
          `page ${path}`,
          false,
          err instanceof Error ? err.message : String(err),
          "BLOCKER",
        );
      }
    }

    try {
      const d = await getJson<{ granted: boolean; mode: string }>(
        `${BASE}/api/delegation`,
      );
      record(
        "authority is granted",
        d.granted,
        d.granted
          ? `granted, mode=${d.mode}`
          : "REVOKED — click Grant before recording, you revoke on camera later",
        "BLOCKER",
      );
    } catch (err) {
      record(
        "delegation readable",
        false,
        err instanceof Error ? err.message : String(err),
        "BLOCKER",
      );
    }
  });

  await section("4. On-chain claims (the same five /proof checks)", async () => {
    const tx = await rpcCall<{ from: string; to: string; nonce: string; input: string }>(
      "eth_getTransactionByHash",
      [TX.mpcRun],
    );
    record(
      "Dynamic: MPC wallet is the sender",
      eq(tx.from, MPC_WALLET) && !eq(tx.from, EXEC_WALLET),
      `from=${tx.from}`,
      "BLOCKER",
    );

    const first = await rpcCall<{ from: string; nonce: string }>(
      "eth_getTransactionByHash",
      [TX.mpcFirst],
    );
    record(
      "Dynamic: first-ever tx from that wallet",
      parseInt(first.nonce, 16) === 0 && eq(first.from, MPC_WALLET),
      `nonce=${parseInt(first.nonce, 16)}`,
      "BLOCKER",
    );

    const swap = await rpcCall<{ to: string; from: string }>(
      "eth_getTransactionByHash",
      [TX.swap],
    );
    record(
      "Uniswap: routed through SwapRouter02",
      eq(swap.to, SWAP_ROUTER) && eq(swap.from, EXEC_WALLET),
      `to=${swap.to}`,
      "BLOCKER",
    );

    const att = await rpcCall<{ to: string; input: string }>(
      "eth_getTransactionByHash",
      [TX.attest],
    );
    const payload = att.input.slice(10);
    const words: number[][] = [];
    for (let i = 0; i + 64 <= payload.length; i += 64) {
      const w: number[] = [];
      for (let j = 0; j < 64; j += 2) {
        w.push(parseInt(payload.slice(i + j, i + j + 2), 16));
      }
      words.push(w);
    }
    const worstZeroRun = Math.max(
      0,
      ...words.map((w) => {
        let best = 0;
        let cur = 0;
        for (const b of w) {
          if (b === 0) {
            cur += 1;
            best = Math.max(best, cur);
          } else cur = 0;
        }
        return best;
      }),
    );
    const leastDistinct = Math.min(...words.map((w) => new Set(w).size));
    record(
      "Runtime: attestation carries no PII",
      eq(att.to, REPUTATION) &&
        words.length === 3 &&
        worstZeroRun < 8 &&
        leastDistinct >= 24,
      `${words.length} words, longest zero run ${worstZeroRun}, weakest word ${leastDistinct}/32 distinct`,
      "BLOCKER",
    );

    const code = await rpcCall<string>("eth_getCode", [REPUTATION, "latest"]);
    record(
      "Runtime: attestation contract deployed",
      code.length > 2,
      `${(code.length - 2) / 2} bytes of bytecode`,
      "BLOCKER",
    );
  });

  await section("5. Gas (a dry wallet fails mid-take)", async () => {
    for (const [label, addr, floor] of [
      ["execution wallet", EXEC_WALLET, 0.0005],
      ["MPC wallet", MPC_WALLET, 0.00005],
    ] as const) {
      const hex = await rpcCall<string>("eth_getBalance", [addr, "latest"]);
      const eth = Number(BigInt(hex)) / 1e18;
      record(
        `${label} funded`,
        eth >= floor,
        `${eth.toFixed(6)} ETH (want >= ${floor})`,
        "WARN",
      );
    }
  });

  await section("6. Story consistency", async () => {
    const cred = readFileSync("src/credentials/index.ts", "utf8");
    const usesBola = cred.includes('full_name: "Bola');
    record(
      "demo credential matches the README story",
      usesBola,
      usesBola ? "demo identity is Bola" : "demo name does not match the README",
      "WARN",
    );
    const proof = existsSync(".data/dynamic-mpc-proof.json");
    record(
      "local MPC receipt on disk",
      proof,
      proof ? ".data/dynamic-mpc-proof.json present" : "absent (cosmetic)",
      "WARN",
    );
  });

  const blockers = results.filter((r) => !r.ok && r.severity === "BLOCKER");
  const warns = results.filter((r) => !r.ok && r.severity === "WARN");
  const passed = results.filter((r) => r.ok).length;

  console.log("\n" + "=".repeat(58));
  console.log(`${passed}/${results.length} checks passed`);
  if (warns.length) {
    console.log(`\n${warns.length} warning(s) — will not stop a take:`);
    for (const w of warns) console.log(`  - ${w.name}: ${w.detail}`);
  }
  if (blockers.length) {
    console.log(`\n${blockers.length} BLOCKER(S) — do not record yet:`);
    for (const b of blockers) console.log(`  - ${b.name}: ${b.detail}`);
    console.log("\nFix the blockers, then run this again.");
    process.exit(1);
  }
  console.log("\nAll blockers clear. You are safe to record.");
}

main().catch((err) => {
  console.error("\npreflight crashed:", err);
  process.exit(1);
});
