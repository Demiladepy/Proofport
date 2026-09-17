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
          left: "4%",
          top: "6%",
          width: 104,
          height: 104,
          borderRadius: 72,
          background: "#64c6ff",
        }}
      />
      <span
        className="pp-mascot pp-mascot-face"
        style={{
          left: "42%",
          top: "44%",
          width: 82,
          height: 74,
          borderRadius: 40,
          background: "#00c978",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "66%",
          top: "12%",
          width: 26,
          height: 26,
          borderRadius: 6,
          background: "#ffcd6c",
          transform: "rotate(18deg)",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "12%",
          top: "74%",
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "#ff3e00",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "74%",
          top: "66%",
          width: 32,
          height: 14,
          borderRadius: 999,
          background: "#ff58ae",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "52%",
          top: "78%",
          width: 14,
          height: 14,
          borderRadius: 3,
          background: "#9f4fff",
          transform: "rotate(35deg)",
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
          right: "10%",
          top: "4%",
          left: "auto",
          width: 96,
          height: 88,
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
          right: "38%",
          top: "46%",
          left: "auto",
          width: 80,
          height: 80,
          borderRadius: 56,
          background: "#ff58ae",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          right: "16%",
          top: "10%",
          left: "auto",
          width: 22,
          height: 22,
          borderRadius: 4,
          background: "#9f4fff",
          transform: "rotate(-12deg)",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          right: "60%",
          top: "22%",
          left: "auto",
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "#00b2ff",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          right: "4%",
          top: "72%",
          left: "auto",
          width: 28,
          height: 14,
          borderRadius: 999,
          background: "#e5d5c3",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          right: "48%",
          top: "76%",
          left: "auto",
          width: 20,
          height: 20,
          borderRadius: 999,
          background: "#00c978",
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
  const hasRun = Boolean(result && !result.error);
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
          <p className="pp-eyebrow">Onchain credit &amp; reputation</p>
          <h1 className="pp-brand">Proofport</h1>
          <p className="pp-tagline">
            Prove once, privately. Proof-agent discloses; execution moves funds
            on a boolean. Reputation attests — hashes only, never PII.
          </p>
          <div className="pp-hero-ctas">
            <button
              type="button"
              className="pp-btn-dark pp-btn-lg"
              disabled={running}
              onClick={() => void run()}
            >
              {running ? "Running…" : "Run the demo"}
            </button>
            <a className="pp-link-demo" href="#ask">
              Or edit the ask ↓
            </a>
          </div>
        </div>
        <HeroArtRight />
      </header>

      <section className="pp-thesis" aria-label="Why judges care">
        <div className="pp-thesis-card">
          <span className="pp-thesis-dot" style={{ background: "#64c6ff" }} />
          <div>
            <strong>Selective disclosure</strong>
            <p>SD-JWT proves verified + country — full ID never leaves the device.</p>
          </div>
        </div>
        <div className="pp-thesis-card">
          <span className="pp-thesis-dot" style={{ background: "#121212" }} />
          <div>
            <strong>Two bounded agents</strong>
            <p>Capability denied in code — not a prompt suggestion.</p>
          </div>
        </div>
        <div className="pp-thesis-card">
          <span className="pp-thesis-dot" style={{ background: "#00c978" }} />
          <div>
            <strong>PII-free reputation</strong>
            <p>Onchain attestation is hashes only — portable credit seed.</p>
          </div>
        </div>
      </section>

      <section className="pp-ask" id="ask" aria-label="Ask the agent">
        <div className="pp-ask-head">
          <p className="pp-section-label">Ask the agent</p>
          <p className="pp-ask-hint">Cash-out wedge · no fiat moves here</p>
        </div>
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
                : "Run credit-rail demo"}
          </button>
          <button
            type="button"
            className="pp-btn-sand"
            onClick={() =>
              setMessage("Get my $500 reward into my Zenith account.")
            }
          >
            Reset prompt
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

      <nav className="pp-beats" aria-label="Demo beats">
        {DEMO_BEATS.map((beat, i) => {
          const done = beatDone[beat.id as keyof typeof beatDone];
          return (
            <div
              key={beat.id}
              className={
                done ? "pp-beat pp-beat-done" : running ? "pp-beat pp-beat-live" : "pp-beat"
              }
            >
              <span className="pp-beat-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pp-beat-label">{beat.label}</span>
            </div>
          );
        })}
      </nav>

      {handoffOk && (
        <div className="pp-success" role="status">
          <div className="pp-success-badge">Settlement initiated</div>
          <p>
            Partner hand-off ready · no fiat moved · reputation{" "}
            {reputation?.txHash ? (
              <a
                href={reputation.explorerUrl}
                target="_blank"
                rel="noreferrer"
              >
                attested onchain
              </a>
            ) : (
              "pending"
            )}
            .
          </p>
        </div>
      )}

      {result?.text && !error && (
        <p className="pp-agent-text">{result.text}</p>
      )}

      <main className="pp-modules" ref={resultsRef} id="results">
        <section className="pp-module pp-module-disclosure">
          <div className="pp-module-head">
            <h2 className="pp-module-title">Selective disclosure</h2>
            {hasRun && (
              <span className="pp-chip pp-chip-mint">
                {openCount} revealed · {ALL_IDENTITY.length - openCount} locked
              </span>
            )}
          </div>
          <p className="pp-module-lead">
            Lit claims leave the device. Struck claims stay cryptographically
            absent — not just hidden in the UI.
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
                  style={
                    open
                      ? { animationDelay: `${i * 60}ms` }
                      : undefined
                  }
                >
                  <div className="pp-row-main">
                    <span
                      className="pp-row-dot"
                      style={{
                        background: open
                          ? CLAIM_COLORS[i % CLAIM_COLORS.length]
                          : "#f2f0ed",
                      }}
                      aria-hidden="true"
                    />
                    <span className="pp-row-name">
                      {claim.label}
                      <em>{claim.key}</em>
                    </span>
                  </div>
                  <span className="pp-row-meta">
                    {open
                      ? String(
                          presentOut?.disclosedClaims?.[claim.key] ?? "revealed",
                        )
                      : hasRun
                        ? "locked"
                        : "waiting"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="pp-exposure">
            Identity exposure:{" "}
            <strong>full ID never left your device</strong>
          </div>
        </section>

        <section className="pp-module pp-module-dark">
          <h2 className="pp-module-title">Capability block</h2>
          <p className="pp-module-lead">
            Hard denials at the tool boundary — not a prompt suggestion.
          </p>
          {capabilityBlocks.length ? (
            <ul className="pp-rows">
              {capabilityBlocks.map((b, i) => {
                const out = b.output as { error?: string };
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
                        {b.agent ?? "?"}-agent
                        <em>{b.toolName}</em>
                      </span>
                    </div>
                    <span className="pp-row-meta">denied</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="pp-empty">
              <p>Proof cannot swap. Execution cannot read credentials.</p>
              <p className="pp-empty-sub">Run the demo to show both denials.</p>
            </div>
          )}
        </section>

        <section className="pp-module">
          <div className="pp-module-head">
            <h2 className="pp-module-title">Reputation earned</h2>
            {reputation?.txHash && (
              <span className="pp-chip pp-chip-mint">PII-free</span>
            )}
          </div>
          <p className="pp-module-lead">
            Portable attestation — subject · kind · evidence hash only.
          </p>
          <div className="pp-kv">
            <div>
              <span>Attestation tx</span>
              <strong>
                {reputation?.explorerUrl ? (
                  <a
                    href={reputation.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {reputation.txHash
                      ? `${reputation.txHash.slice(0, 12)}…`
                      : "view on Basescan"}
                  </a>
                ) : (
                  "—"
                )}
              </strong>
            </div>
            <div>
              <span>PII fields onchain</span>
              <strong className={reputation ? "ok" : ""}>
                {reputation
                  ? `${reputation.piiFields?.length ?? 0} — portable, PII-free`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Evidence hash</span>
              <strong className="pp-mono">
                {reputation?.evidenceHash
                  ? `${reputation.evidenceHash.slice(0, 20)}…`
                  : "—"}
              </strong>
            </div>
          </div>
        </section>

        <section className="pp-module pp-module-plan">
          <h2 className="pp-module-title">Agent plan</h2>
          {toolCalls.length ? (
            <ol className="pp-rows">
              {toolCalls.map((t, i) => (
                <li
                  key={`${t.toolName}-${i}`}
                  className="pp-row"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="pp-row-main">
                    <span className="pp-row-index">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="pp-row-name">
                      {t.agent ? `${t.agent}:` : ""}
                      {t.toolName}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="pp-empty">
              <p>Orchestrator path appears here after you run.</p>
              <p className="pp-empty-sub">
                proof → deny → swap → x402 → attest → handoff
              </p>
            </div>
          )}
        </section>

        <section className="pp-module pp-module-settle">
          <h2 className="pp-module-title">Settlement</h2>
          <div className="pp-kv">
            <div>
              <span>Swap</span>
              <strong>
                {swapOut?.provider ?? "—"}{" "}
                {swapOut?.explorerUrl ? (
                  <a
                    href={swapOut.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    tx
                  </a>
                ) : (
                  (swapOut?.txHash?.slice(0, 14) ?? "")
                )}
              </strong>
              {swapOut?.note && <p className="muted">{swapOut.note}</p>}
            </div>
            <div>
              <span>x402 self-funding</span>
              <strong className={payOut?.paidVia === "x402" ? "ok" : ""}>
                {payOut?.message ?? "—"}
              </strong>
            </div>
            <div>
              <span>Partner hand-off · no fiat</span>
              <strong>
                {handoffOut?.status ?? "—"}
                {handoffOut?.reference ? ` · ${handoffOut.reference}` : ""}
              </strong>
              {handoffOut?.note && <p className="muted">{handoffOut.note}</p>}
            </div>
          </div>
        </section>
      </main>

      <footer className="pp-footer">
        <p>
          Credit &amp; reputation for agentic finance — Nigeria is the wedge,
          not the ceiling.
        </p>
        <p className="pp-footer-meta">
          Live vs simulated boundaries in MOCKS.md · Base Sepolia · Dynamic +
          Uniswap tracks
        </p>
      </footer>
    </div>
  );
}
