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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (meta && e.key === "Enter") {
        e.preventDefault();
        void run();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run]);

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
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="pp-shell">
      <nav className="pp-nav" aria-label="Proofport">
        <div className="pp-nav-brand">
          <div className="pp-nav-mark" aria-hidden="true" />
          <div>
            <p className="pp-nav-name">Proofport</p>
            <p className="pp-nav-meta">Runtime · Bankr × Propaganda</p>
          </div>
        </div>
        <div className="pp-nav-actions">
          <span
            className={
              delegation?.granted ? "pp-pill pp-pill-on" : "pp-pill pp-pill-off"
            }
          >
            <span className="pp-pill-dot" aria-hidden="true" />
            {delegation?.granted ? "Authority granted" : "Authority revoked"}
          </span>
          <button type="button" className="pp-btn ghost" onClick={grant}>
            Grant
          </button>
          <button type="button" className="pp-btn danger" onClick={revoke}>
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

      <section className="pp-palette" aria-label="Command palette">
        <div className="pp-palette-input-row">
          <span className="pp-palette-prompt" aria-hidden="true">
            ›
          </span>
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Ask the cash-out agent…"
            aria-label="Agent prompt"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void run();
              }
            }}
          />
        </div>
        <div className="pp-palette-footer">
          <div className="pp-palette-hints">
            <span className="pp-palette-hint">
              <kbd className="pp-kbd pp-kbd-sm">{isMac ? "⌘" : "Ctrl"}</kbd>
              <kbd className="pp-kbd pp-kbd-sm">K</kbd>
              Focus
            </span>
            <span className="pp-palette-hint">
              <kbd className="pp-kbd pp-kbd-sm">{isMac ? "⌘" : "Ctrl"}</kbd>
              <kbd className="pp-kbd pp-kbd-sm">↵</kbd>
              Run
            </span>
          </div>
          <div className="pp-palette-actions">
            <button
              type="button"
              className="pp-btn primary"
              disabled={running}
              onClick={() => void run()}
            >
              {running ? "Agent working…" : "Run cash-out agent"}
              {!running && (
                <kbd className="pp-kbd pp-kbd-sm" aria-hidden="true">
                  ↵
                </kbd>
              )}
            </button>
          </div>
        </div>
        {error && <p className="pp-error">{error}</p>}
        {result?.text && <p className="pp-agent-text">{result.text}</p>}
      </section>

      <main className="pp-grid">
        <section className="pp-window">
          <div className="pp-window-chrome">
            <div className="pp-window-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2 className="pp-window-title">Agent plan</h2>
            <span className="pp-kbd pp-kbd-sm">tools</span>
          </div>
          <div className="pp-window-body">
            {toolCalls.length ? (
              <ol className="pp-rows">
                {toolCalls.map((t, i) => (
                  <li
                    key={`${t.toolName}-${i}`}
                    className="pp-row pp-row-enter"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="pp-row-main">
                      <span className="pp-row-index">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <code>{t.toolName}</code>
                    </div>
                    <span className="pp-row-meta">
                      <kbd className="pp-kbd pp-kbd-sm">↵</kbd>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="pp-row-empty">Waiting for a run…</p>
            )}
          </div>
        </section>

        <section className="pp-window">
          <div className="pp-window-chrome">
            <div className="pp-window-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2 className="pp-window-title">Selective disclosure</h2>
            <span className="pp-kbd pp-kbd-sm">sd-jwt</span>
          </div>
          <div className="pp-window-body">
            <p className="muted">
              Only lit claims leave the device. Locked claims stay
              cryptographically absent.
            </p>
            <ul className="pp-rows">
              {ALL_IDENTITY.map((claim) => {
                const open = disclosed.has(claim);
                return (
                  <li
                    key={claim}
                    className={
                      open
                        ? "pp-row pp-row-open"
                        : "pp-row pp-row-locked"
                    }
                  >
                    <div className="pp-row-main">
                      <span className="pp-row-code">{claim}</span>
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
              <strong>
                full ID never left your device
              </strong>
              {" · "}
              <span className="accent">minimal present</span>
            </div>
          </div>
        </section>

        <section className="pp-window pp-window-wide">
          <div className="pp-window-chrome">
            <div className="pp-window-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2 className="pp-window-title">On-chain & payments</h2>
            <span className="pp-kbd pp-kbd-sm">x402</span>
          </div>
          <div className="pp-window-body">
            <div className="pp-kv pp-kv-triple">
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
                <span>Licensed partner (mock — no fiat)</span>
                <strong>
                  {handoffOut?.status ?? "—"}{" "}
                  {handoffOut?.reference ? `(${handoffOut.reference})` : ""}
                </strong>
                {handoffOut?.note && (
                  <p className="muted">{handoffOut.note}</p>
                )}
              </div>
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
