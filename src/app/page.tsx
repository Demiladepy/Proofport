"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ToolCall = {
  toolName: string;
  agent?: string;
  input: unknown;
  output: unknown;
};

type AgentResponse = {
  mode?: string;
  text?: string;
  toolCalls?: ToolCall[];
  capabilityBlocks?: ToolCall[];
  proofVerified?: boolean;
  reputation?: {
    txHash?: string;
    explorerUrl?: string;
    subject?: string;
    kind?: string;
    evidenceHash?: string;
    piiFields?: string[];
  };
  error?: string;
};

type Delegation = {
  granted: boolean;
  mode: string;
  revokedAt?: string;
  note?: string;
};

const ALL_IDENTITY = [
  { key: "verified", label: "Verified" },
  { key: "country", label: "Country" },
  { key: "over_18", label: "Over 18" },
  { key: "full_name", label: "Full name" },
  { key: "id_number", label: "ID number" },
] as const;

const CLAIM_COLORS = [
  "#64c6ff",
  "#00c978",
  "#ffcd6c",
  "#ff58ae",
  "#9f4fff",
] as const;

const DEMO_BEATS = [
  { id: "proof", label: "Disclose" },
  { id: "capability", label: "Bound" },
  { id: "swap", label: "Swap" },
  { id: "x402", label: "Pay" },
  { id: "reputation", label: "Attest" },
  { id: "handoff", label: "Hand off" },
] as const;

function HeroArtLeft() {
  return (
    <div className="pp-hero-art" aria-hidden="true">
      <span
        className="pp-mascot pp-mascot-face"
        style={{
          left: "10%",
          top: "14%",
          width: 92,
          height: 92,
          borderRadius: 72,
          background: "#64c6ff",
        }}
      />
      <span
        className="pp-mascot pp-mascot-face"
        style={{
          left: "48%",
          top: "52%",
          width: 68,
          height: 62,
          borderRadius: 40,
          background: "#00c978",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "68%",
          top: "18%",
          width: 18,
          height: 18,
          borderRadius: 5,
          background: "#ffcd6c",
          transform: "rotate(16deg)",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "18%",
          top: "72%",
          width: 14,
          height: 14,
          borderRadius: 999,
          background: "#ff3e00",
        }}
      />
    </div>
  );
}

function HeroArtRight() {
  return (
    <div className="pp-hero-art" aria-hidden="true">
      <span
        className="pp-mascot"
        style={{
          right: "14%",
          top: "10%",
          left: "auto",
          width: 84,
          height: 76,
          borderRadius: 18,
          background: "#ffcd6c",
          clipPath: "polygon(50% 4%, 96% 92%, 4% 92%)",
          border: "none",
          boxShadow: "inset 0 0 0 1.5px #343433",
        }}
      />
      <span
        className="pp-mascot pp-mascot-face"
        style={{
          right: "42%",
          top: "50%",
          left: "auto",
          width: 70,
          height: 70,
          borderRadius: 56,
          background: "#ff58ae",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          right: "20%",
          top: "14%",
          left: "auto",
          width: 16,
          height: 16,
          borderRadius: 4,
          background: "#9f4fff",
          transform: "rotate(-10deg)",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          right: "8%",
          top: "68%",
          left: "auto",
          width: 22,
          height: 12,
          borderRadius: 999,
          background: "#e5d5c3",
        }}
      />
    </div>
  );
}

export default function Home() {
  const [message, setMessage] = useState(
    "Get my $500 reward into my Zenith account.",
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const refreshDelegation = useCallback(async () => {
    const res = await fetch("/api/delegation");
    setDelegation(await res.json());
  }, []);

  useEffect(() => {
    void refreshDelegation();
  }, [refreshDelegation]);

  const presentOut = result?.toolCalls?.find((t) => t.toolName === "present_proof")
    ?.output as
    | {
        disclosed?: string[];
        withheld?: string[];
        disclosedClaims?: Record<string, unknown>;
      }
    | undefined;

  const swapOut = result?.toolCalls?.find((t) => t.toolName === "swap")?.output as
    | { txHash?: string; explorerUrl?: string; provider?: string; note?: string }
    | undefined;

  const payOut = result?.toolCalls?.find((t) => t.toolName === "pay_x402")
    ?.output as
    | { paidVia?: string; message?: string }
    | undefined;

  const handoffOut = result?.toolCalls?.find((t) => t.toolName === "request_handoff")
    ?.output as
    | { status?: string; note?: string; reference?: string }
    | undefined;

  const capabilityBlocks = result?.capabilityBlocks ?? [];
  const reputation = result?.reputation;
  const hasRun = Boolean(result && !error);
  const handoffOk = handoffOut?.status === "settlement_initiated";

  const beatDone = {
    proof: Boolean(presentOut?.disclosed?.length),
    capability: capabilityBlocks.length >= 2,
    swap: Boolean(swapOut),
    x402: payOut?.paidVia === "x402",
    reputation: Boolean(reputation?.txHash),
    handoff: handoffOk,
  };

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as AgentResponse;
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setResult(data);
      } else {
        setResult(data);
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
      await refreshDelegation();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [message, running, refreshDelegation]);

  async function revoke() {
    const res = await fetch("/api/delegation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });
    setDelegation(await res.json());
  }

  async function grant() {
    const res = await fetch("/api/delegation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grant" }),
    });
    setDelegation(await res.json());
  }

  const disclosed = new Set(presentOut?.disclosed ?? []);
  const toolCalls = result?.toolCalls ?? [];
  const openCount = disclosed.size;
  const doneCount = Object.values(beatDone).filter(Boolean).length;

  return (
    <div className="pp-shell">
      <nav className="pp-nav" aria-label="Proofport">
        <div className="pp-nav-brand">
          <div className="pp-nav-mark" aria-hidden="true" />
          <p className="pp-nav-name">Proofport</p>
        </div>
        <p className="pp-nav-center">Runtime · Bankr × Propaganda</p>
        <div className="pp-nav-actions">
          <span
            className="pp-status"
            data-on={delegation?.granted ? "true" : "false"}
          >
            {delegation?.granted ? "Authority on" : "Revoked"}
          </span>
          <button type="button" className="pp-btn-ghost" onClick={grant}>
            Grant
          </button>
          <button type="button" className="pp-btn-ghost danger" onClick={revoke}>
            Revoke
          </button>
        </div>
      </nav>

      <header className="pp-hero">
        <HeroArtLeft />
        <div className="pp-hero-center">
          <p className="pp-eyebrow">Credit &amp; reputation rail</p>
          <h1 className="pp-brand">Proofport</h1>
          <p className="pp-tagline">
            Prove privately. Move funds on a boolean. Attest onchain — never
            PII.
          </p>
        </div>
        <HeroArtRight />
      </header>

      <section className="pp-ask" id="ask" aria-label="Ask the agent">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Describe the cash-out…"
          aria-label="Agent prompt"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
        />
        <div className="pp-ask-actions">
          <button
            type="button"
            className="pp-btn-dark pp-btn-lg"
            disabled={running || Boolean(delegation?.revokedAt)}
            onClick={() => void run()}
          >
            {running
              ? "Working…"
              : delegation?.revokedAt
                ? "Grant authority first"
                : "Run demo"}
          </button>
          <p className="pp-hint">⌘ / Ctrl + Enter</p>
        </div>
        {error && (
          <p className="pp-error">
            {error === "authority revoked"
              ? "Authority revoked — Grant again to continue."
              : error}
          </p>
        )}
      </section>

      <ol className="pp-beats" aria-label="Demo progress">
        {DEMO_BEATS.map((beat) => {
          const done = beatDone[beat.id as keyof typeof beatDone];
          return (
            <li
              key={beat.id}
              className={
                done
                  ? "pp-beat pp-beat-done"
                  : running
                    ? "pp-beat pp-beat-live"
                    : "pp-beat"
              }
            >
              <span className="pp-beat-dot" aria-hidden="true" />
              <span className="pp-beat-label">{beat.label}</span>
            </li>
          );
        })}
      </ol>
      {(hasRun || running) && (
        <p className="pp-beats-meta">
          {running ? "Running pipeline…" : `${doneCount} of ${DEMO_BEATS.length} beats complete`}
        </p>
      )}

      {handoffOk && (
        <div className="pp-success" role="status">
          <span className="pp-success-badge">Settlement initiated</span>
          <p>
            No fiat moved.
            {reputation?.explorerUrl && (
              <>
                {" "}
                <a
                  href={reputation.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Reputation attested
                </a>
              </>
            )}
          </p>
        </div>
      )}

      <main className="pp-modules" ref={resultsRef} id="results">
        <section className="pp-module pp-module-disclosure">
          <div className="pp-module-head">
            <h2 className="pp-module-title">Selective disclosure</h2>
            {hasRun && (
              <span className="pp-chip">
                {openCount} open · {ALL_IDENTITY.length - openCount} locked
              </span>
            )}
          </div>
          <p className="pp-module-lead">
            Only what the step needs leaves the device.
          </p>
          <ul className="pp-rows">
            {ALL_IDENTITY.map((claim, i) => {
              const open = disclosed.has(claim.key);
              return (
                <li
                  key={claim.key}
                  className={
                    open
                      ? "pp-row pp-row-open"
                      : hasRun
                        ? "pp-row pp-row-locked"
                        : "pp-row pp-row-idle"
                  }
                  style={open ? { animationDelay: `${i * 50}ms` } : undefined}
                >
                  <div className="pp-row-main">
                    <span
                      className="pp-row-dot"
                      style={{
                        background: open
                          ? CLAIM_COLORS[i % CLAIM_COLORS.length]
                          : "transparent",
                      }}
                      aria-hidden="true"
                    />
                    <span className="pp-row-name">{claim.label}</span>
                  </div>
                  <span className="pp-row-meta">
                    {open
                      ? String(
                          presentOut?.disclosedClaims?.[claim.key] ?? "yes",
                        )
                      : hasRun
                        ? "locked"
                        : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="pp-exposure">
            <strong>Full ID never left your device.</strong>
          </p>
        </section>

        <section className="pp-module pp-module-dark">
          <h2 className="pp-module-title">Capability block</h2>
          <p className="pp-module-lead">
            Denied in code — not by prompt.
          </p>
          {capabilityBlocks.length ? (
            <ul className="pp-rows">
              {capabilityBlocks.map((b, i) => {
                const iconColors = ["#0090ff", "#9f4fff", "#00ca48", "#ff58ae"];
                return (
                  <li key={`${b.toolName}-${i}`} className="pp-row">
                    <div className="pp-row-main">
                      <span
                        className="pp-row-dot"
                        style={{
                          background: iconColors[i % iconColors.length],
                          borderColor: "transparent",
                        }}
                        aria-hidden="true"
                      />
                      <span className="pp-row-name">
                        {b.agent}-agent
                        <em>{b.toolName}</em>
                      </span>
                    </div>
                    <span className="pp-row-meta">denied</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pp-empty">Run to show proof ≠ funds, execution ≠ credentials.</p>
          )}
        </section>

        <section className="pp-module">
          <div className="pp-module-head">
            <h2 className="pp-module-title">Reputation</h2>
            {reputation?.txHash && <span className="pp-chip">PII-free</span>}
          </div>
          <p className="pp-module-lead">
            Onchain hashes only — portable credit seed.
          </p>
          <div className="pp-kv">
            <div>
              <span>Attestation</span>
              <strong>
                {reputation?.explorerUrl ? (
                  <a
                    href={reputation.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {reputation.txHash
                      ? `${reputation.txHash.slice(0, 10)}…`
                      : "Basescan"}
                  </a>
                ) : (
                  "—"
                )}
              </strong>
            </div>
            <div>
              <span>PII onchain</span>
              <strong className={reputation ? "ok" : ""}>
                {reputation ? "0 fields" : "—"}
              </strong>
            </div>
          </div>
        </section>

        <section className="pp-module pp-module-plan">
          <h2 className="pp-module-title">Plan</h2>
          {toolCalls.length ? (
            <ol className="pp-plan">
              {toolCalls.map((t, i) => (
                <li key={`${t.toolName}-${i}`}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {t.agent ? `${t.agent}:` : ""}
                  {t.toolName}
                </li>
              ))}
            </ol>
          ) : (
            <p className="pp-empty">proof → deny → swap → pay → attest → handoff</p>
          )}
        </section>

        <section className="pp-module pp-module-settle">
          <h2 className="pp-module-title">Settlement</h2>
          <div className="pp-kv">
            <div>
              <span>Swap</span>
              <strong>{swapOut?.provider ?? "—"}</strong>
            </div>
            <div>
              <span>x402</span>
              <strong className={payOut?.paidVia === "x402" ? "ok" : ""}>
                {payOut?.paidVia === "x402" ? "Paid" : "—"}
              </strong>
            </div>
            <div>
              <span>Hand-off</span>
              <strong>{handoffOut?.status ?? "—"}</strong>
            </div>
          </div>
        </section>
      </main>

      <footer className="pp-footer">
        <p>Nigeria is the wedge, not the ceiling.</p>
        <p className="pp-footer-meta">MOCKS.md · Base Sepolia · Dynamic + Uniswap</p>
      </footer>
    </div>
  );
}
