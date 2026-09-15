"use client";

import { useCallback, useEffect, useState } from "react";

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

  async function run() {
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
  }

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

  return (
    <div className="pp-shell">
      <header className="pp-header">
        <div>
          <p className="pp-eyebrow">Runtime · Bankr × Propaganda</p>
          <h1 className="pp-brand">Proofport</h1>
          <p className="pp-tagline">
            Prove once, privately. Agent cash-out to the edge of the regulated
            rail — no fiat in this app.
          </p>
        </div>
        <div className="pp-auth">
          <span
            className={
              delegation?.granted ? "pp-pill pp-pill-on" : "pp-pill pp-pill-off"
            }
          >
            {delegation?.granted ? "Authority granted" : "Authority revoked"}
          </span>
          <button type="button" className="pp-btn ghost" onClick={grant}>
            Grant
          </button>
          <button type="button" className="pp-btn danger" onClick={revoke}>
            Revoke
          </button>
        </div>
      </header>

      <main className="pp-grid">
        <section className="pp-panel pp-chat">
          <h2>Ask</h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <button
            type="button"
            className="pp-btn primary"
            disabled={running}
            onClick={run}
          >
            {running ? "Agent working…" : "Run cash-out agent"}
          </button>
          {error && <p className="pp-error">{error}</p>}
          {result?.text && <p className="pp-agent-text">{result.text}</p>}
        </section>

        <section className="pp-panel">
          <h2>Agent plan</h2>
          <ol className="pp-steps">
            {(result?.toolCalls ?? []).map((t, i) => (
              <li key={`${t.toolName}-${i}`}>
                <code>{t.toolName}</code>
              </li>
            ))}
            {!result?.toolCalls?.length && (
              <li className="muted">Waiting for a run…</li>
            )}
          </ol>
        </section>

        <section className="pp-panel pp-viz">
          <h2>Selective disclosure</h2>
          <p className="muted">
            Only lit claims leave the device. Locked claims stay
            cryptographically absent from the presentation.
          </p>
          <ul className="pp-claims">
            {ALL_IDENTITY.map((claim) => {
              const open = disclosed.has(claim);
              return (
                <li
                  key={claim}
                  className={open ? "claim claim-open" : "claim claim-locked"}
                >
                  <span className="claim-name">{claim}</span>
                  <span className="claim-state">
                    {open
                      ? String(presentOut?.disclosedClaims?.[claim] ?? "revealed")
                      : "locked"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="pp-exposure">
            Identity exposure: <strong>full ID never left your device</strong>
          </div>
        </section>

        <section className="pp-panel">
          <h2>On-chain & payments</h2>
          <div className="pp-kv">
            <div>
              <span>Swap</span>
              <strong>
                {swapOut?.provider ?? "—"}{" "}
                {swapOut?.explorerUrl ? (
                  <a href={swapOut.explorerUrl} target="_blank" rel="noreferrer">
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
              <span>Licensed partner (mock — no fiat)</span>
              <strong>
                {handoffOut?.status ?? "—"}{" "}
                {handoffOut?.reference ? `(${handoffOut.reference})` : ""}
              </strong>
              {handoffOut?.note && <p className="muted">{handoffOut.note}</p>}
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
