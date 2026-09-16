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
  "verified",
  "country",
  "over_18",
  "full_name",
  "id_number",
] as const;

const CLAIM_COLORS = [
  "#64c6ff",
  "#00c978",
  "#ffcd6c",
  "#ff58ae",
  "#9f4fff",
] as const;

function HeroArtLeft() {
  return (
    <div className="pp-hero-art" aria-hidden="true">
      <span
        className="pp-mascot"
        style={{
          left: "8%",
          top: "12%",
          width: 88,
          height: 88,
          borderRadius: 72,
          background: "#64c6ff",
        }}
      />
      <span
        className="pp-mascot"
        style={{
          left: "42%",
          top: "48%",
          width: 72,
          height: 64,
          borderRadius: 40,
          background: "#00c978",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "58%",
          top: "18%",
          width: 22,
          height: 22,
          borderRadius: 4,
          background: "#ffcd6c",
          transform: "rotate(18deg)",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "18%",
          top: "68%",
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "#ff3e00",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          left: "70%",
          top: "72%",
          width: 28,
          height: 14,
          borderRadius: 999,
          background: "#ff58ae",
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
          top: "20%",
          left: "auto",
          width: 80,
          height: 80,
          borderRadius: 20,
          background: "#ffcd6c",
          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
          border: "none",
          boxShadow: "inset 0 0 0 1.5px #343433",
        }}
      />
      <span
        className="pp-mascot"
        style={{
          right: "38%",
          top: "52%",
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
          right: "22%",
          top: "12%",
          left: "auto",
          width: 20,
          height: 20,
          borderRadius: 4,
          background: "#9f4fff",
          transform: "rotate(-12deg)",
        }}
      />
      <span
        className="pp-confetti"
        style={{
          right: "55%",
          top: "28%",
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
          right: "8%",
          top: "68%",
          left: "auto",
          width: 26,
          height: 14,
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
            Prove privately. Two bounded agents. Reputation onchain — hashes
            only, never PII. Cash-out is the wedge.
          </p>
          <div className="pp-hero-ctas">
            <button
              type="button"
              className="pp-btn-dark"
              disabled={running}
              onClick={() => {
                inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                inputRef.current?.focus();
              }}
            >
              Get started
            </button>
            <a className="pp-link-demo" href="#ask">
              Watch the demo flow
            </a>
          </div>
        </div>
        <HeroArtRight />
      </header>

      <section className="pp-ask" id="ask" aria-label="Ask the agent">
        <p className="pp-section-label">Ask</p>
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
            className="pp-btn-dark"
            disabled={running}
            onClick={() => void run()}
          >
            {running ? "Working…" : "Run credit-rail demo"}
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
        {error && <p className="pp-error">{error}</p>}
        {result?.text && <p className="pp-agent-text">{result.text}</p>}
      </section>

      <main className="pp-modules">
        <section className="pp-module pp-module-disclosure">
          <h2 className="pp-module-title">Selective disclosure</h2>
          <p className="pp-module-lead">
            Lit claims leave the device. Struck claims stay cryptographically
            absent — not just hidden in the UI.
          </p>
          <ul className="pp-rows">
            {ALL_IDENTITY.map((claim, i) => {
              const open = disclosed.has(claim);
              return (
                <li
                  key={claim}
                  className={
                    open ? "pp-row pp-row-open" : "pp-row pp-row-locked"
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
                    <span className="pp-row-name">{claim}</span>
                  </div>
                  <span className="pp-row-meta">
                    {open
                      ? String(
                          presentOut?.disclosedClaims?.[claim] ?? "revealed",
                        )
                      : "locked"}
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
                        {b.agent ?? "?"}-agent · {b.toolName}
                      </span>
                    </div>
                    <span className="pp-row-meta">
                      {out.error ?? "capability denied"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pp-row-empty">
              Run to show proof denied funds &amp; execution denied credential
              reads.
            </p>
          )}
        </section>

        <section className="pp-module">
          <h2 className="pp-module-title">Reputation earned</h2>
          <p className="pp-module-lead">
            Portable, PII-free attestation — subject · kind · evidence hash
            only.
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
                      ? `${reputation.txHash.slice(0, 10)}…`
                      : "view"}
                  </a>
                ) : (
                  (reputation?.txHash ?? "—")
                )}
              </strong>
            </div>
            <div>
              <span>PII fields onchain</span>
              <strong className="ok">
                {reputation
                  ? `${reputation.piiFields?.length ?? 0} — portable, PII-free`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Evidence hash</span>
              <strong className="pp-mono">
                {reputation?.evidenceHash
                  ? `${reputation.evidenceHash.slice(0, 18)}…`
                  : "—"}
              </strong>
            </div>
          </div>
        </section>

        <section className="pp-module">
          <h2 className="pp-module-title">Agent plan</h2>
          {toolCalls.length ? (
            <ol className="pp-rows">
              {toolCalls.map((t, i) => (
                <li key={`${t.toolName}-${i}`} className="pp-row">
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
            <p className="pp-row-empty">Run the agent to see the plan.</p>
          )}
        </section>

        <section className="pp-module">
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
                  (swapOut?.txHash ?? "")
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
        Credit &amp; reputation for agentic finance — Nigeria is the wedge, not
        the ceiling. Live vs simulated: MOCKS.md.
      </footer>
    </div>
  );
}
