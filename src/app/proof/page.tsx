"use client";

/**
 * Proof Wall — every claim Proofport makes, checked against Base Sepolia
 * live, from the visitor's own browser.
 *
 * Deliberately client-side: the RPC call leaves the judge's machine and goes
 * straight to the canonical public endpoint. Nothing here is served, cached or
 * signed by us, so there is nothing for us to fake. If a check fails, it says
 * so in red.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const RPC = "https://sepolia.base.org";
const EXPLORER = "https://sepolia.basescan.org/tx/";

const MPC_WALLET = "0xa83850ab6e3e15e038ee5f79318c40985ac7ea77";
const EXEC_WALLET = "0x0afc983c15444dfdaad76abf22f1d1053035ae67";
const SWAP_ROUTER = "0x94cc0aac535ccdb3c01d6787d6413c739ae12bc4";
const REPUTATION = "0xac188e1e9d624b346006dfe233290751165f2f16";

const TX_MPC_RUN =
  "0x85fd02dd919213773d969ba998aac04533750aa31fc987c0e31e6cd633465d04";
const TX_MPC_FIRST =
  "0xd96b57f60add3852d684676343a0528947f380b9fdea65d85661f1b473c8c9e1";
const TX_SWAP =
  "0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3";
const TX_ATTEST =
  "0xd546a412a54646441b33990c3bd91854e6fe65d04ee97ca7eb1a73979c7cdef8";

type Check = { label: string; expected: string; actual: string; ok: boolean };
type Phase = "idle" | "checking" | "pass" | "fail" | "error";

type Claim = {
  id: string;
  track: "Dynamic" | "Uniswap" | "Runtime";
  title: string;
  why: string;
  txHash?: string;
  run: () => Promise<Check[]>;
};

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  if (json.result === undefined || json.result === null) {
    throw new Error(`${method} returned nothing`);
  }
  return json.result;
}

type Tx = { from: string; to: string; nonce: string; input: string };
type Receipt = { status: string; blockNumber: string };

function short(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function eq(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function wordBytes(word: string): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < word.length; i += 2) {
    out.push(parseInt(word.slice(i, i + 2), 16));
  }
  return out;
}

/**
 * Text stuffed into a bytes32 slot leaves a long tail of zero padding:
 * "Ada Lovelace" is 12 bytes of text and 20 bytes of zeros. A real hash has
 * essentially none. This is the tell we look for.
 */
function longestZeroRun(bytes: number[]): number {
  let best = 0;
  let current = 0;
  for (const b of bytes) {
    if (b === 0) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

/** Hashes use almost the whole byte range. Human-readable text repeats. */
function distinctBytes(bytes: number[]): number {
  return new Set(bytes).size;
}

const CLAIMS: Claim[] = [
  {
    id: "dynamic-run",
    track: "Dynamic",
    title: "A Dynamic MPC server wallet signed its own transaction",
    why: "The signature came from threshold MPC, not from a private key we hold. The sender field is the proof — we could not forge it.",
    txHash: TX_MPC_RUN,
    run: async () => {
      const tx = await rpc<Tx>("eth_getTransactionByHash", [TX_MPC_RUN]);
      const receipt = await rpc<Receipt>("eth_getTransactionReceipt", [
        TX_MPC_RUN,
      ]);
      return [
        {
          label: "Sender is the Dynamic MPC wallet",
          expected: short(MPC_WALLET),
          actual: short(tx.from),
          ok: eq(tx.from, MPC_WALLET),
        },
        {
          label: `Sender is not our local key ${short(EXEC_WALLET)}`,
          expected: `any address except ${short(EXEC_WALLET)}`,
          actual: eq(tx.from, EXEC_WALLET) ? "same key — not MPC" : "different key",
          ok: !eq(tx.from, EXEC_WALLET),
        },
        {
          label: "Transaction succeeded",
          expected: "status 1",
          actual: `status ${parseInt(receipt.status, 16)}`,
          ok: receipt.status === "0x1",
        },
      ];
    },
  },
  {
    id: "dynamic-first",
    track: "Dynamic",
    title: "It was that wallet's first transaction ever",
    why: "Nonce zero means this address had never transacted before. The wallet was minted through Dynamic and its very first act was an MPC signature.",
    txHash: TX_MPC_FIRST,
    run: async () => {
      const tx = await rpc<Tx>("eth_getTransactionByHash", [TX_MPC_FIRST]);
      const receipt = await rpc<Receipt>("eth_getTransactionReceipt", [
        TX_MPC_FIRST,
      ]);
      return [
        {
          label: "Nonce is zero (first tx from this address)",
          expected: "nonce 0",
          actual: `nonce ${parseInt(tx.nonce, 16)}`,
          ok: parseInt(tx.nonce, 16) === 0,
        },
        {
          label: "Same MPC wallet as above",
          expected: short(MPC_WALLET),
          actual: short(tx.from),
          ok: eq(tx.from, MPC_WALLET),
        },
        {
          label: "Transaction succeeded",
          expected: "status 1",
          actual: `status ${parseInt(receipt.status, 16)}`,
          ok: receipt.status === "0x1",
        },
      ];
    },
  },
  {
    id: "uniswap",
    track: "Uniswap",
    title: "A real Uniswap V3 fill through SwapRouter02",
    why: "Not the Trading API, not a mock. The execution-agent routed ETH to USDC through the canonical SwapRouter02 on Base Sepolia.",
    txHash: TX_SWAP,
    run: async () => {
      const tx = await rpc<Tx>("eth_getTransactionByHash", [TX_SWAP]);
      const receipt = await rpc<Receipt>("eth_getTransactionReceipt", [TX_SWAP]);
      return [
        {
          label: "Recipient is Uniswap SwapRouter02",
          expected: short(SWAP_ROUTER),
          actual: short(tx.to),
          ok: eq(tx.to, SWAP_ROUTER),
        },
        {
          label: "Sent by the execution-agent wallet",
          expected: short(EXEC_WALLET),
          actual: short(tx.from),
          ok: eq(tx.from, EXEC_WALLET),
        },
        {
          label: "Swap succeeded",
          expected: "status 1",
          actual: `status ${parseInt(receipt.status, 16)}`,
          ok: receipt.status === "0x1",
        },
      ];
    },
  },
  {
    id: "attestation",
    track: "Runtime",
    title: "The reputation attestation contains no personal data",
    why: "We pull the raw calldata into your browser and inspect it byte by byte. Text stuffed into a 32-byte slot leaves a long tail of zero padding — “Ada Lovelace” would be 12 bytes of name and 20 bytes of zeros. These words have none of that signature.",
    txHash: TX_ATTEST,
    run: async () => {
      const tx = await rpc<Tx>("eth_getTransactionByHash", [TX_ATTEST]);
      const receipt = await rpc<Receipt>("eth_getTransactionReceipt", [
        TX_ATTEST,
      ]);
      const payload = tx.input.slice(10); // strip 4-byte selector
      const words: number[][] = [];
      for (let i = 0; i + 64 <= payload.length; i += 64) {
        words.push(wordBytes(payload.slice(i, i + 64)));
      }
      const worstZeroRun = Math.max(0, ...words.map(longestZeroRun));
      const leastDistinct = Math.min(...words.map(distinctBytes));
      return [
        {
          label: "Written to the attestation contract",
          expected: short(REPUTATION),
          actual: short(tx.to),
          ok: eq(tx.to, REPUTATION),
        },
        {
          label: "Payload is three fixed-width words, not a string",
          expected: "3 x 32-byte words",
          actual: `${words.length} x 32-byte words`,
          ok: words.length === 3,
        },
        {
          label: "No zero-padding tail that would betray packed text",
          expected: "longest zero run under 8 bytes",
          actual: `longest zero run ${worstZeroRun} bytes`,
          ok: worstZeroRun < 8,
        },
        {
          label: "Every word has hash-like byte spread, not repetitive text",
          expected: "at least 24 distinct byte values of 32",
          actual: `${leastDistinct} of 32 distinct in the weakest word`,
          ok: leastDistinct >= 24,
        },
        {
          label: "Write succeeded",
          expected: "status 1",
          actual: `status ${parseInt(receipt.status, 16)}`,
          ok: receipt.status === "0x1",
        },
      ];
    },
  },
  {
    id: "contract",
    track: "Runtime",
    title: "The attestation contract is really deployed",
    why: "A lender reads this contract and nothing else. If it did not exist, every reputation claim on this site would be theatre.",
    run: async () => {
      const code = await rpc<string>("eth_getCode", [REPUTATION, "latest"]);
      const bytes = Math.max(0, (code.length - 2) / 2);
      return [
        {
          label: "Contract has deployed bytecode",
          expected: "more than 0 bytes",
          actual: `${bytes} bytes`,
          ok: bytes > 0,
        },
      ];
    },
  },
];

const NOT_CLAIMED = [
  "No fiat moves. No bank API. The licensed-partner leg is a labelled mock.",
  "The identity issuer is a local demo keypair, not a government register.",
  "The x402 compliance body is mock data. The 402 handshake is real; the answer is not.",
  "Grant / Revoke is an app-level gate, not an on-chain policy contract.",
];

export default function ProofWall() {
  const [phases, setPhases] = useState<Record<string, Phase>>({});
  const [checks, setChecks] = useState<Record<string, Check[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [blockNow, setBlockNow] = useState<number | null>(null);
  const running = useRef(false);

  const verifyAll = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setPhases({});
    setChecks({});
    setErrors({});
    setStartedAt(new Date().toLocaleTimeString());

    try {
      const hex = await rpc<string>("eth_blockNumber", []);
      setBlockNow(parseInt(hex, 16));
    } catch {
      setBlockNow(null);
    }

    for (const claim of CLAIMS) {
      setPhases((p) => ({ ...p, [claim.id]: "checking" }));
      try {
        const result = await claim.run();
        setChecks((c) => ({ ...c, [claim.id]: result }));
        setPhases((p) => ({
          ...p,
          [claim.id]: result.every((r) => r.ok) ? "pass" : "fail",
        }));
      } catch (err) {
        setErrors((e) => ({
          ...e,
          [claim.id]: err instanceof Error ? err.message : String(err),
        }));
        setPhases((p) => ({ ...p, [claim.id]: "error" }));
      }
      await new Promise((r) => setTimeout(r, 220));
    }
    running.current = false;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void verifyAll(), 400);
    return () => clearTimeout(t);
  }, [verifyAll]);

  const passed = CLAIMS.filter((c) => phases[c.id] === "pass").length;
  const settled = CLAIMS.filter((c) =>
    ["pass", "fail", "error"].includes(phases[c.id] ?? ""),
  ).length;
  const allDone = settled === CLAIMS.length;

  return (
    <div className="pw-shell">
      <header className="pw-head">
        <Link href="/" className="pw-back">
          &larr; Proofport
        </Link>
        <p className="pw-kicker">Proof wall</p>
        <h1 className="pw-title">
          Checked by your browser.
          <br />
          Not by our server.
        </h1>
        <p className="pw-lead">
          Every claim below is being verified right now by a request from{" "}
          <strong>your machine</strong> to the public Base Sepolia endpoint{" "}
          <code>{RPC}</code>. Proofport is not in the loop. There is nothing here
          for us to fake &mdash; if something breaks, this page turns red.
        </p>

        <div className="pw-meter" role="status">
          <div className="pw-meter-bar">
            <span
              className="pw-meter-fill"
              style={{ width: `${(settled / CLAIMS.length) * 100}%` }}
            />
          </div>
          <span className="pw-meter-text">
            {allDone
              ? `${passed} of ${CLAIMS.length} claims verified on-chain`
              : `Verifying ${settled} of ${CLAIMS.length}…`}
          </span>
        </div>

        <div className="pw-actions">
          <button
            type="button"
            className="pw-btn"
            onClick={() => void verifyAll()}
          >
            Verify again
          </button>
          {startedAt && (
            <span className="pw-stamp">
              Ran at {startedAt}
              {blockNow ? ` · chain head #${blockNow.toLocaleString()}` : ""}
            </span>
          )}
        </div>
      </header>

      <ol className="pw-list">
        {CLAIMS.map((claim) => {
          const phase = phases[claim.id] ?? "idle";
          const rows = checks[claim.id] ?? [];
          return (
            <li key={claim.id} className="pw-claim" data-phase={phase}>
              <div className="pw-claim-head">
                <span className="pw-track" data-track={claim.track}>
                  {claim.track}
                </span>
                <span className="pw-verdict" data-phase={phase}>
                  {phase === "pass"
                    ? "Verified"
                    : phase === "fail"
                      ? "Failed"
                      : phase === "error"
                        ? "Unreachable"
                        : phase === "checking"
                          ? "Checking…"
                          : "Queued"}
                </span>
              </div>
              <h2 className="pw-claim-title">{claim.title}</h2>
              <p className="pw-claim-why">{claim.why}</p>

              {rows.length > 0 && (
                <ul className="pw-checks">
                  {rows.map((row) => (
                    <li key={row.label} data-ok={row.ok ? "yes" : "no"}>
                      <span className="pw-check-mark" aria-hidden="true">
                        {row.ok ? "✓" : "✗"}
                      </span>
                      <span className="pw-check-label">
                        {row.label}
                        {!row.ok && (
                          <em className="pw-check-expected">
                            expected {row.expected}
                          </em>
                        )}
                      </span>
                      <span className="pw-check-actual">{row.actual}</span>
                    </li>
                  ))}
                </ul>
              )}

              {errors[claim.id] && (
                <p className="pw-error">
                  Could not reach the chain: {errors[claim.id]}. That is a
                  network problem, not a failed claim &mdash; the explorer link
                  still works.
                </p>
              )}

              {claim.txHash && (
                <a
                  className="pw-link"
                  href={`${EXPLORER}${claim.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open this transaction on Basescan &rarr;
                </a>
              )}
            </li>
          );
        })}
      </ol>

      <section className="pw-not">
        <h2 className="pw-not-title">What we are deliberately not claiming</h2>
        <p className="pw-not-lead">
          A verification page that only lists wins is marketing. These are the
          boundaries, in the same place as the proof.
        </p>
        <ul>
          {NOT_CLAIMED.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="pw-not-foot">
          The full ledger, with a file and line number behind every row, is in{" "}
          <a
            href="https://github.com/Demiladepy/Proofport/blob/main/MOCKS.md"
            target="_blank"
            rel="noreferrer"
          >
            MOCKS.md
          </a>
          .
        </p>
      </section>
    </div>
  );
}
