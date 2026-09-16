"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ToolCall = { toolName: string; input: unknown; output: unknown };

type AgentResponse = {
  mode?: string;
  text?: string;
  toolCalls?: ToolCall[];
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
        presentation?: string;
      }
    | undefined;

  const swapOut = result?.toolCalls?.find((t) => t.toolName === "swap")?.output as
    | { txHash?: string; explorerUrl?: string; provider?: string; note?: string }
    | undefined;

  const payOut = result?.toolCalls?.find((t) => t.toolName === "pay_x402")
    ?.output as
    | { paidVia?: string; message?: string; paymentEvidence?: unknown }
    | undefined;

  const handoffOut = result?.toolCalls?.find((t) => t.toolName === "request_handoff")
    ?.output as
    | { status?: string; note?: string; reference?: string }
    | undefined;

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
            {delegation?.granted ? "Authority granted" : "Authority revoked"}
          </span>
          <button type="button" className="pp-btn-ghost muted" onClick={grant}>
            Grant
          </button>
          <button type="button" className="pp-btn-ghost danger" onClick={revoke}>
            Revoke
          </button>
        </div>
      </nav>

      <header className="pp-hero">
        <p className="pp-eyebrow">Selective disclosure · agent cash-out</p>
        <h1 className="pp-brand">Proofport</h1>
        <p className="pp-tagline">
          Prove once, privately. Agent cash-out to the edge of the regulated
          rail — no fiat in this app.
        </p>
      </header>

      <section className="pp-ask" aria-label="Ask the agent">
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
            className="pp-btn-pill"
            disabled={running}
            onClick={() => void run()}
          >
            {running ? "Working…" : "Run cash-out agent"}
          </button>
        </div>
        {error && <p className="pp-error">{error}</p>}
        {result?.text && <p className="pp-agent-text">{result.text}</p>}
      </section>

      <main className="pp-modules">
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
                    <span className="pp-row-name">{t.toolName}</span>
                  </div>
                  <span className="pp-row-meta">Tool</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="pp-row-empty">Waiting for a run…</p>
          )}
        </section>

        <section className="pp-module">
          <h2 className="pp-module-title">Disclosure</h2>
          <p className="pp-module-lead">
            Only lit claims leave the device. Locked claims stay
            cryptographically absent from the presentation.
          </p>
          <ul className="pp-rows">
            {ALL_IDENTITY.map((claim) => {
              const open = disclosed.has(claim);
              return (
                <li
                  key={claim}
                  className={
                    open ? "pp-row pp-row-open" : "pp-row pp-row-locked"
                  }
                >
                  <div className="pp-row-main">
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
                  swapOut?.txHash ?? ""
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
              <span>Licensed partner · no fiat</span>
              <strong>
                {handoffOut?.status ?? "—"}{" "}
                {handoffOut?.reference ? `(${handoffOut.reference})` : ""}
              </strong>
              {handoffOut?.note && (
                <p className="muted">{handoffOut.note}</p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="pp-footer">
        Emerging markets are where agentic finance is 10× — Nigeria is the proof,
        not the pitch. See MOCKS.md for live vs simulated boundaries.
      </footer>
    </div>
  );
}
