import "dotenv/config";
import { grantDelegation } from "../src/delegation";
import { runOrchestrator } from "../src/orchestrator";
import { listAttestations, readAttestation } from "../src/reputation";
import type { Hex } from "viem";

const BASE = process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000";

async function timed<T>(name: string, fn: () => Promise<T>) {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { name, ok: true, ms: Date.now() - t0, value };
  } catch (err) {
    return {
      name,
      ok: false,
      ms: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function httpJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, bytes: text.length, json, text };
}

async function main() {
  const jar: string[] = [];
  function cookieHeader() {
    return jar.join("; ");
  }
  async function http(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (jar.length) headers.set("cookie", cookieHeader());
    const res = await fetch(`${BASE}${path}`, { ...init, headers });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const pair = c.split(";")[0];
      if (pair) {
        const key = pair.split("=")[0];
        const rest = jar.filter((x) => !x.startsWith(`${key}=`));
        rest.push(pair);
        jar.splice(0, jar.length, ...rest);
      }
    }
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, bytes: text.length, json, html: json ? null : text.slice(0, 400) };
  }

  const pages = await Promise.all([
    timed("GET /", () => httpJson("/")),
    timed("GET /lender", () => httpJson("/lender")),
    timed("GET /api/health", () => httpJson("/api/health")),
    timed("GET /api/status", () => httpJson("/api/status")),
  ]);

  const grant = await timed("POST grant", () =>
    http("/api/delegation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "grant" }),
    }),
  );
  const revoke = await timed("POST revoke", () =>
    http("/api/delegation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    }),
  );
  const blocked = await timed("POST /api/agent while revoked", () =>
    http("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "should fail",
        recipient: "Zenith",
        amount: "500",
        country: "NG",
      }),
    }),
  );
  const regrant = await timed("POST grant again", () =>
    http("/api/delegation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "grant" }),
    }),
  );

  process.env.SWAP_PROVIDER = "mock";
  grantDelegation({ mode: "app_level_fallback" });

  const runA = await timed("orchestrator Nigeria (mock swap)", () =>
    runOrchestrator({
      message: "Cash out $500 to Zenith in Nigeria",
      recipient: "Zenith",
      amount: "500",
      country: "NG",
    }),
  );
  const runB = await timed("orchestrator age-gated (mock swap)", () =>
    runOrchestrator({
      message: "Age-gated payout: prove I am over 18, no country needed",
      recipient: "Access",
      amount: "50",
      country: "NG",
    }),
  );

  const aVal = runA.ok
    ? (runA as { value: Awaited<ReturnType<typeof runOrchestrator>> }).value
    : null;
  const bVal = runB.ok
    ? (runB as { value: Awaited<ReturnType<typeof runOrchestrator>> }).value
    : null;

  const list = await timed("listAttestations(20)", () => listAttestations(20));
  const lenderA = aVal?.reputation?.subject
    ? await timed("readAttestation A", () =>
        readAttestation(aVal.reputation!.subject as Hex),
      )
    : null;
  const lenderHttp = aVal?.reputation?.subject
    ? await timed("GET /api/reputation?subject=A", () =>
        httpJson(
          `/api/reputation?subject=${encodeURIComponent(aVal.reputation!.subject!)}`,
        ),
      )
    : null;
  const zero = await timed("GET empty subject", () =>
    httpJson(
      "/api/reputation?subject=0x0000000000000000000000000000000000000000000000000000000000000001",
    ),
  );

  const home = pages[0].ok
    ? (pages[0] as { value: Awaited<ReturnType<typeof httpJson>> }).value
    : null;
  const lenderPage = pages[1].ok
    ? (pages[1] as { value: Awaited<ReturnType<typeof httpJson>> }).value
    : null;
  const status = pages[3].ok
    ? (pages[3] as { value: Awaited<ReturnType<typeof httpJson>> }).value
    : null;

  const report = {
    pages: pages.map(({ name, ok, ms, value, error }) => ({
      name,
      ok,
      ms,
      status: value && "status" in value ? value.status : undefined,
      bytes: value && "bytes" in value ? value.bytes : undefined,
      error,
    })),
    authority: {
      grantStatus: grant.ok
        ? (grant as { value: { status: number } }).value.status
        : null,
      revokeStatus: revoke.ok
        ? (revoke as { value: { status: number } }).value.status
        : null,
      blockedStatus: blocked.ok
        ? (blocked as { value: { status: number; json: { error?: string } } }).value
            .status
        : null,
      blockedError: blocked.ok
        ? (
            blocked as {
              value: { json: { error?: string } };
            }
          ).value.json?.error
        : null,
      regrantStatus: regrant.ok
        ? (regrant as { value: { status: number } }).value.status
        : null,
      grantMs: grant.ms,
      blockedMs: blocked.ms,
    },
    homeHasHeroButton: Boolean(home?.text?.includes("Open the cash-out demo")),
    homeHasHonesty: Boolean(home?.text?.includes("ID issuer = SIMULATED")),
    homeHasFields: Boolean(
      home?.text?.includes("Recipient") && home?.text?.includes("Amount USD"),
    ),
    homeNavDemoIsAnchor: Boolean(home?.text?.includes('href="#demo"')),
    lenderHasTitle: Boolean(lenderPage?.text?.includes("Read the hash")),
    statusJson: status?.json,
    runA: aVal
      ? {
          ms: runA.ms,
          claims: aVal.disclosure?.claims,
          source: aVal.disclosure?.source,
          rationale: aVal.disclosure?.rationale,
          subject: aVal.reputation?.subject,
          tx: aVal.reputation?.txHash,
          blocks: aVal.capabilityBlocks.length,
          swap: (
            aVal.toolCalls.find((t) => t.toolName === "swap")?.output as {
              provider?: string;
            }
          )?.provider,
          handoff: (aVal.handoff as { status?: string } | undefined)?.status,
        }
      : { error: "runA failed", ms: runA.ms },
    runB: bVal
      ? {
          ms: runB.ms,
          claims: bVal.disclosure?.claims,
          source: bVal.disclosure?.source,
          rationale: bVal.disclosure?.rationale,
          subject: bVal.reputation?.subject,
          tx: bVal.reputation?.txHash,
          blocks: bVal.capabilityBlocks.length,
          distinctFromA: aVal?.reputation?.subject !== bVal.reputation?.subject,
        }
      : { error: "runB failed", ms: runB.ms },
    listMs: list.ms,
    listCount: list.ok
      ? (list as { value: unknown[] }).value.length
      : 0,
    lenderHttp: lenderHttp
      ? {
          ms: lenderHttp.ms,
          json: lenderHttp.ok
            ? (lenderHttp as { value: { json: unknown } }).value.json
            : null,
        }
      : null,
    emptySubject: zero.ok
      ? (zero as { value: { json: unknown } }).value.json
      : null,
    lenderReadA: lenderA?.ok
      ? {
          attestedAt: (
            lenderA as {
              value: { attestedAt: bigint; piiFields: string[] };
            }
          ).value.attestedAt.toString(),
          pii:
            (
              lenderA as {
                value: { piiFields: string[] };
              }
            ).value.piiFields,
        }
      : null,
  };

  console.log(JSON.stringify(report, null, 2));
  grantDelegation({ mode: "app_level_fallback" });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
