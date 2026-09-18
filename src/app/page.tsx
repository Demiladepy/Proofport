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

type RailStatus = {
  chain: string;
  explorerBase: string;
  proofWallet: string;
  executionWallet: string;
  reputationContract: string;
  walletsNote: string;
  swapProvider: string;
  x402Mode: string;
  partner: string;
};

const ALL_IDENTITY = [
  { key: "verified", label: "Verified", idle: "Will disclose" },
  { key: "country", label: "Country", idle: "Will disclose" },
  { key: "over_18", label: "Over 18", idle: "Stays private" },
  { key: "full_name", label: "Full name", idle: "Stays private" },
  { key: "id_number", label: "ID number", idle: "Stays private" },
] as const;

const CLAIM_COLORS = [
  "#64c6ff",
  "#00c978",
  "#ffcd6c",
  "#ff58ae",
  "#9f4fff",
] as const;

const PIPELINE = [
  { id: "proof", label: "Disclose", agent: "Proof" },
  { id: "capability", label: "Bound", agent: "Both" },
  { id: "swap", label: "Swap", agent: "Execution" },
  { id: "x402", label: "Pay", agent: "Execution" },
  { id: "reputation", label: "Attest", agent: "Orchestrator" },
  { id: "handoff", label: "Hand off", agent: "Execution" },
] as const;

const PLAN_IDLE = [
  { agent: "proof", tool: "get_credentials" },
  { agent: "proof", tool: "present_proof" },
  { agent: "proof", tool: "attempt_swap" },
  { agent: "execution", tool: "attempt_read_credential" },
  { agent: "execution", tool: "swap" },
  { agent: "execution", tool: "pay_x402" },
  { agent: "orchestrator", tool: "write_attestation" },
  { agent: "execution", tool: "request_handoff" },
] as const;

const DENIALS_IDLE = [
  {
    agent: "proof",
    tool: "attempt_swap",
    why: "Proof agent has no fund tools",
    color: "#0090ff",
  },
  {
    agent: "execution",
    tool: "attempt_read_credential",
    why: "Execution agent never sees claims",
    color: "#9f4fff",
  },
] as const;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

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
  const [rail, setRail] = useState<RailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const refreshDelegation = useCallback(async () => {
    const res = await fetch("/api/delegation");
    setDelegation(await res.json());
  }, []);

  useEffect(() => {
    void refreshDelegation();
    void fetch("/api/status")
      .then((r) => r.json())
      .then((data: RailStatus) => setRail(data))
      .catch(() => setRail(null));
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
  const explorer = rail?.explorerBase ?? "https://sepolia.basescan.org";

  return (
    <div className="pp-shell">
      <nav className="pp-nav" aria-label="Proofport">
        <div className="pp-nav-brand">
          <div className="pp-nav-mark" aria-hidden="true" />
          <p className="pp-nav-name">Proofport</p>
        </div>
        <div className="pp-nav-links">
          <a href="#how">How it works</a>
          <a href="#agents">Agents</a>
          <a href="#demo">Demo</a>
        </div>
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
          <p className="pp-eyebrow">Credit and reputation rail</p>
          <h1 className="pp-brand">Proofport</h1>
          <p className="pp-tagline">
            Prove privately. Move funds on a boolean. Attest onchain, never PII.
          </p>
          <div className="pp-hero-ctas">
            <a className="pp-btn-dark pp-btn-lg" href="#demo">
              Open the cash-out demo
            </a>
            <a className="pp-link-demo" href="#how">
              See the rail
            </a>
          </div>
        </div>
        <HeroArtRight />
      </header>

      <section className="pp-how" id="how">
        <p className="pp-section-kicker">What actually happens</p>
        <h2 className="pp-section-title">Six steps, two agents, one boolean</h2>
        <ol className="pp-how-grid">
          <li>
            <span>01</span>
            <strong>Issue credentials</strong>
            <p>
              SD-JWT identity and provenance. Name and ID stay cryptographically
              withheld.
            </p>
          </li>
          <li>
            <span>02</span>
            <strong>Present proof</strong>
            <p>
              Proof agent discloses verified + country only. Partner never sees
              the rest.
            </p>
          </li>
          <li>
            <span>03</span>
            <strong>Hard capability denials</strong>
            <p>
              Proof cannot swap. Execution cannot read credentials. Enforced in
              the tool registry, not a prompt.
            </p>
          </li>
          <li>
            <span>04</span>
            <strong>Swap and self-pay</strong>
            <p>
              Execution wallet converts to USDC, then pays the x402 compliance
              check from its own funds.
            </p>
          </li>
          <li>
            <span>05</span>
            <strong>Write reputation</strong>
            <p>
              Custom Base Sepolia contract stores subject, kind, and evidence
              hash. Zero PII fields.
            </p>
          </li>
          <li>
            <span>06</span>
            <strong>Partner hand-off</strong>
            <p>
              Licensed-partner mock re-verifies the presentation. Status is
              settlement_initiated. No fiat moves here.
            </p>
          </li>
        </ol>
      </section>

      <section className="pp-agents" id="agents">
        <article className="pp-agent-card">
          <p className="pp-section-kicker">Proof agent</p>
          <h3>Credentials only</h3>
          <p>
            Holds IdentityVC and ProvenanceVC. Can present and check
            delegation. Cannot touch funds.
          </p>
          <ul>
            <li>get_credentials</li>
            <li>present_proof</li>
            <li>check_delegation</li>
            <li className="deny">attempt_swap (hard deny)</li>
          </ul>
          {rail && (
            <a
              className="pp-mono-link"
              href={`${explorer}/address/${rail.proofWallet}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddr(rail.proofWallet)}
            </a>
          )}
        </article>
        <article className="pp-agent-card pp-agent-card-dark">
          <p className="pp-section-kicker">Execution agent</p>
          <h3>Funds only</h3>
          <p>
            Receives a verifier boolean, not claims. Swaps, pays x402, requests
            hand-off. Cannot read credentials.
          </p>
          <ul>
            <li>swap</li>
            <li>pay_x402</li>
            <li>request_handoff</li>
            <li className="deny">attempt_read_credential (hard deny)</li>
          </ul>
          {rail && (
            <a
              className="pp-mono-link"
              href={`${explorer}/address/${rail.executionWallet}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddr(rail.executionWallet)}
            </a>
          )}
        </article>
      </section>

      {rail && (
        <section className="pp-rail" aria-label="Live rail">
          <div>
            <span>Chain</span>
            <strong>{rail.chain}</strong>
          </div>
          <div>
            <span>Reputation contract</span>
            <strong>
              <a
                href={`${explorer}/address/${rail.reputationContract}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddr(rail.reputationContract)}
              </a>
            </strong>
          </div>
          <div>
            <span>Swap</span>
            <strong>{rail.swapProvider}</strong>
          </div>
          <div>
            <span>x402</span>
            <strong>{rail.x402Mode}</strong>
          </div>
          <div>
            <span>Partner</span>
            <strong>{rail.partner}</strong>
          </div>
        </section>
      )}

      <section className="pp-ask" id="demo" aria-label="Run the cash-out">
        <p className="pp-section-kicker">Live demo</p>
        <h2 className="pp-section-title">Cash-out wedge</h2>
        <p className="pp-ask-lead">
          One request drives the orchestrator: proof, denials, swap, x402,
          attestation, partner. Grant authority, then run.
        </p>
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Describe the cash-out"
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
              ? "Running pipeline"
              : delegation?.revokedAt
                ? "Grant authority first"
                : "Run cash-out"}
          </button>
          <p className="pp-hint">Ctrl + Enter</p>
        </div>
        {error && (
          <p className="pp-error">
            {error === "authority revoked"
              ? "Authority revoked. Grant again to continue."
              : error}
          </p>
        )}
      </section>

      <ol className="pp-beats" aria-label="Pipeline progress">
        {PIPELINE.map((beat) => {
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
      <p className="pp-beats-meta">
        {running
          ? "Orchestrator running"
          : hasRun
            ? `${doneCount} of ${PIPELINE.length} steps complete`
            : "Idle preview. Run cash-out to fill live results."}
      </p>

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
            <span className="pp-chip">
              {hasRun
                ? `${openCount} open, ${ALL_IDENTITY.length - openCount} locked`
                : "Preview"}
            </span>
          </div>
          <p className="pp-module-lead">
            Only verified and country leave the device. Full name and ID never
            enter the presentation.
          </p>
          <ul className="pp-rows">
            {ALL_IDENTITY.map((claim, i) => {
              const open = disclosed.has(claim.key);
              const willShare = claim.idle === "Will disclose";
              return (
                <li
                  key={claim.key}
                  className={
                    open
                      ? "pp-row pp-row-open"
                      : hasRun
                        ? "pp-row pp-row-locked"
                        : willShare
                          ? "pp-row pp-row-will"
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
                        ? "Locked"
                        : claim.idle}
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
            Denied in the tool registry, not by prompt.
          </p>
          <ul className="pp-rows">
            {(capabilityBlocks.length
              ? capabilityBlocks.map((b, i) => ({
                  agent: b.agent ?? "?",
                  tool: b.toolName,
                  why: "capability denied",
                  color: ["#0090ff", "#9f4fff"][i % 2],
                }))
              : DENIALS_IDLE
            ).map((b) => (
              <li key={`${b.agent}-${b.tool}`} className="pp-row">
                <div className="pp-row-main">
                  <span
                    className="pp-row-dot"
                    style={{
                      background: b.color,
                      borderColor: "transparent",
                    }}
                    aria-hidden="true"
                  />
                  <span className="pp-row-name">
                    {b.agent}-agent
                    <em>{b.tool}</em>
                  </span>
                </div>
                <span className="pp-row-meta">
                  {capabilityBlocks.length ? "Denied" : "Will deny"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="pp-module">
          <div className="pp-module-head">
            <h2 className="pp-module-title">Reputation</h2>
            <span className="pp-chip">
              {reputation?.txHash ? "Written" : "PII-free"}
            </span>
          </div>
          <p className="pp-module-lead">
            Onchain hashes only. Portable credit seed.
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
                  "Waiting for write"
                )}
              </strong>
            </div>
            <div>
              <span>PII onchain</span>
              <strong className={reputation ? "ok" : ""}>
                {reputation ? "0 fields" : "Contract has no PII slots"}
              </strong>
            </div>
            {rail && (
              <div>
                <span>Contract</span>
                <strong>
                  <a
                    href={`${explorer}/address/${rail.reputationContract}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddr(rail.reputationContract)}
                  </a>
                </strong>
              </div>
            )}
          </div>
        </section>

        <section className="pp-module pp-module-plan">
          <h2 className="pp-module-title">Orchestrator plan</h2>
          <ol className="pp-plan">
            {(toolCalls.length
              ? toolCalls.map((t) => ({
                  agent: t.agent ?? "",
                  tool: t.toolName,
                }))
              : PLAN_IDLE
            ).map((t, i) => (
              <li key={`${t.tool}-${i}`}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {t.agent ? `${t.agent}:` : ""}
                {t.tool}
              </li>
            ))}
          </ol>
        </section>

        <section className="pp-module pp-module-settle">
          <h2 className="pp-module-title">Settlement</h2>
          <div className="pp-kv">
            <div>
              <span>Swap</span>
              <strong>{swapOut?.provider ?? "ETH to USDC (pending)"}</strong>
              {swapOut?.note && <p className="muted">{swapOut.note}</p>}
            </div>
            <div>
              <span>x402 self-pay</span>
              <strong className={payOut?.paidVia === "x402" ? "ok" : ""}>
                {payOut?.paidVia === "x402"
                  ? "Paid"
                  : "Compliance check (pending)"}
              </strong>
            </div>
            <div>
              <span>Partner hand-off</span>
              <strong>
                {handoffOut?.status ?? "No fiat. Re-verify then initiate."}
              </strong>
              {handoffOut?.note && <p className="muted">{handoffOut.note}</p>}
            </div>
          </div>
        </section>
      </main>

      <footer className="pp-footer">
        <div className="pp-footer-inner">
          <div className="pp-footer-logo" aria-hidden="true">
            <div className="pp-footer-mark" />
            <span className="pp-footer-petal" />
          </div>
          <nav aria-label="Footer">
            <ul className="pp-footer-groups">
              <li>
                <h5>Product</h5>
                <ul>
                  <li>
                    <a href="#how">How it works</a>
                  </li>
                  <li>
                    <a href="#agents">Two agents</a>
                  </li>
                  <li>
                    <a href="#demo">Watch the demo</a>
                  </li>
                  <li>
                    <a href="#results">Live results</a>
                  </li>
                </ul>
              </li>
              <li>
                <h5>Rail</h5>
                <ul>
                  <li>
                    <a
                      href={`${explorer}/address/${rail?.executionWallet ?? "0x0afC983C15444DFDaaD76aBF22f1D1053035AE67"}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Execution wallet
                    </a>
                  </li>
                  <li>
                    <a
                      href={`${explorer}/address/${rail?.proofWallet ?? "0xab18207957208a31025306f08556893e2a15dBa9"}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Proof wallet
                    </a>
                  </li>
                  <li>
                    <a
                      href={`${explorer}/address/${rail?.reputationContract ?? "0xac188e1e9d624b346006dfe233290751165f2f16"}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Reputation contract
                    </a>
                  </li>
                  <li>
                    <a href="https://sepolia.basescan.org">Base Sepolia</a>
                  </li>
                </ul>
              </li>
              <li>
                <h5>Company</h5>
                <ul>
                  <li>
                    <a href="https://github.com/Demiladepy/Proofport">
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/Demiladepy/Proofport/blob/main/MOCKS.md">
                      Honest mocks
                    </a>
                  </li>
                  <li>
                    <span>Runtime · Bankr × Propaganda</span>
                  </li>
                  <li>
                    <span>No PII onchain</span>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
        <div className="pp-footer-info">
          <p>© 2026 Proofport</p>
          <p>Nigeria is the wedge, not the ceiling.</p>
        </div>
      </footer>
    </div>
  );
}
