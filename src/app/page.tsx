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
  disclosure?: {
    claims: string[];
    rationale: string;
    source: "openai" | "fallback";
  };
  request?: {
    recipient: string;
    amount: string;
    country: string;
  };
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
  swapLabel?: string;
  swapRouter?: string;
  uniswapLive?: boolean;
  tradingApi?: boolean;
  x402Mode: string;
  partner: string;
  dynamic?: {
    envReady: boolean;
    wsl: boolean;
    webhookCreds: boolean;
    webhookSecret?: boolean;
    signer: "dynamic_mpc" | "local_viem";
    mpcProven?: boolean;
    note: string;
    mpcAddress?: string;
    mpcEth?: string;
    mpcProof?: {
      txHash: string;
      explorerUrl: string;
      address: string;
    };
  };
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
  {
    id: "issuer",
    label: "Issue",
    agent: "Proof",
    honesty: "sim" as const,
    honestyLabel: "Demo identity",
  },
  {
    id: "proof",
    label: "Disclose",
    agent: "Proof",
    honesty: "live" as const,
    honestyLabel: "Private proof",
  },
  {
    id: "capability",
    label: "Bound",
    agent: "Both",
    honesty: "live" as const,
    honestyLabel: "Agents cannot cross",
  },
  {
    id: "swap",
    label: "Swap",
    agent: "Execution",
    honesty: "live" as const,
    honestyLabel: "Uniswap on Base Sepolia",
    liveLabel: "Uniswap on Base Sepolia",
  },
  {
    id: "x402",
    label: "Pay",
    agent: "Execution",
    honesty: "mixed" as const,
    honestyLabel: "Payment header",
  },
  {
    id: "reputation",
    label: "Attest",
    agent: "Orchestrator",
    honesty: "live" as const,
    honestyLabel: "Onchain hash",
  },
  {
    id: "handoff",
    label: "Hand off",
    agent: "Execution",
    honesty: "sim" as const,
    honestyLabel: "Bank stays off our books",
  },
] as const;

const HONESTY_LEGEND = [
  { honesty: "sim", text: "Identity issuer: demo (no government ID)" },
  { honesty: "live", text: "Swap: Uniswap, Base Sepolia" },
  { honesty: "sim", text: "Bank payout: not sent from this app" },
  { honesty: "live", text: "Credit hash: live onchain" },
] as const;

type HonestyRow = { honesty: "live" | "sim" | "mixed"; text: string };

/**
 * The authority row reports what the rail can do *right now*, not what it did
 * once. Claiming MPC while the Linux signer is down would be a lie.
 */
function authorityHonestyRow(
  dynamic: RailStatus["dynamic"],
): HonestyRow {
  if (dynamic?.signer === "dynamic_mpc") {
    return {
      honesty: "live",
      text: `Delegated authority LIVE: Grant/Revoke governs Dynamic MPC wallet ${shortAddress(
        dynamic.mpcAddress,
      )}, which signs on-chain.`,
    };
  }
  if (dynamic?.mpcProven) {
    return {
      honesty: "mixed",
      text: "Grant/Revoke is LIVE. Dynamic MPC signing is proven on-chain but its Linux signer is offline right now, so this run signs with the local key.",
    };
  }
  return {
    honesty: "mixed",
    text: "Delegated authority (Grant/Revoke) is LIVE at app level; execution signs with the local key.",
  };
}

function shortAddress(address?: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const DENIALS_IDLE = [
  {
    agent: "Proof",
    line: "Cannot swap or send funds",
    color: "#0090ff",
  },
  {
    agent: "Execution",
    line: "Cannot read name, ID, or country",
    color: "#9f4fff",
  },
] as const;

function BrandMark({ className }: { className: string }) {
  return (
    <img
      className={className}
      src="/proofport-mark.png"
      alt="Proofport"
      width={72}
      height={88}
    />
  );
}

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
  const [recipient, setRecipient] = useState("Zenith");
  const [amount, setAmount] = useState("500");
  const [country, setCountry] = useState("NG");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [recentAttestations, setRecentAttestations] = useState<
    { subject: string; attestedAt: string; creditEligible: boolean }[]
  >([]);
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [rail, setRail] = useState<RailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState<"grant" | "revoke" | null>(null);
  const [scrolled, setScrolled] = useState(false);
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reduce) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }
    document.documentElement.classList.add("pp-motion");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -10% 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [rail]);

  const presentOut = result?.toolCalls?.find((t) => t.toolName === "present_proof")
    ?.output as
    | {
        disclosed?: string[];
        withheld?: string[];
        disclosedClaims?: Record<string, unknown>;
      }
    | undefined;

  const swapOut = result?.toolCalls?.find((t) => t.toolName === "swap")?.output as
    | {
        txHash?: string;
        explorerUrl?: string;
        provider?: string;
        via?: string;
        note?: string;
      }
    | undefined;

  const payOut = result?.toolCalls?.find((t) => t.toolName === "pay_x402")
    ?.output as
    | { paidVia?: string; message?: string }
    | undefined;

  const mpcOut = result?.toolCalls?.find(
    (t) => t.toolName === "dynamic_mpc_sign",
  )?.output as
    | {
        signer?: string;
        live?: boolean;
        from?: string;
        txHash?: string;
        explorerUrl?: string;
        note?: string;
        lastMpcTx?: string;
      }
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
    issuer: Boolean(
      result?.toolCalls?.some((t) => t.toolName === "get_credentials"),
    ),
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
        body: JSON.stringify({ message, recipient, amount, country }),
      });
      const data = (await res.json()) as AgentResponse;
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setResult(data);
      } else {
        setResult(data);
        requestAnimationFrame(() => {
          document.getElementById("demo")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
      await refreshDelegation();
      try {
        const list = await fetch("/api/reputation");
        const json = (await list.json()) as {
          items?: { subject: string; attestedAt: string; creditEligible: boolean }[];
        };
        if (Array.isArray(json.items)) {
          setRecentAttestations(
            json.items.filter((item) => item.creditEligible),
          );
        }
      } catch {
        /* list is optional */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [message, recipient, amount, country, running, refreshDelegation]);

  async function setAuthority(action: "grant" | "revoke") {
    if (authBusy) return;
    setAuthBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/delegation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as Delegation;
      if (!res.ok) {
        throw new Error("Could not update authority");
      }
      setDelegation(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAuthBusy(null);
    }
  }

  const disclosed = new Set(presentOut?.disclosed ?? []);
  const openCount = disclosed.size;
  const doneCount = Object.values(beatDone).filter(Boolean).length;
  const explorer = rail?.explorerBase ?? "https://sepolia.basescan.org";
  const swapRouter =
    rail?.swapRouter ?? "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4";
  const swapTrackLive = rail?.uniswapLive !== false;
  const swapBeatLive = hasRun
    ? swapOut?.provider === "uniswap"
    : swapTrackLive;
  const swapFallbackNote =
    hasRun &&
    swapOut?.provider &&
    swapOut.provider !== "uniswap"
      ? "Uniswap quote failed, used internal fallback."
      : null;
  const honestyLegend: readonly HonestyRow[] = [
    ...HONESTY_LEGEND,
    authorityHonestyRow(rail?.dynamic),
  ];
  const authorityOn = Boolean(delegation?.granted);
  const authorityLocked = delegation !== null && !delegation.granted;

  return (
    <div className="pp-shell">
      <nav
        className={scrolled ? "pp-nav pp-nav-stuck" : "pp-nav"}
        aria-label="Proofport"
      >
        <div className="pp-nav-brand">
          <BrandMark className="pp-nav-mark" />
          <p className="pp-nav-name">Proofport</p>
        </div>
        <div className="pp-nav-links">
          <a href="#how">How it works</a>
          <a href="#agents">Agents</a>
          <a href="#demo">Demo</a>
          <a href="/proof">Proof wall</a>
        </div>
        <div className="pp-nav-actions">
          <span
            className="pp-status"
            data-on={authorityOn ? "true" : "false"}
            aria-live="polite"
          >
            {delegation === null
              ? "Checking"
              : authorityOn
                ? "Authority on"
                : "Revoked"}
          </span>
          <button
            type="button"
            className="pp-btn-sand"
            aria-pressed={authorityOn}
            disabled={authBusy !== null}
            onClick={() => void setAuthority("grant")}
          >
            {authBusy === "grant" ? "Granting" : "Grant"}
          </button>
          <button
            type="button"
            className="pp-btn-sand pp-btn-revoke"
            aria-pressed={!authorityOn && delegation !== null}
            disabled={authBusy !== null}
            onClick={() => void setAuthority("revoke")}
          >
            {authBusy === "revoke" ? "Revoking" : "Revoke"}
          </button>
        </div>
      </nav>

      <header className="pp-hero">
        <HeroArtLeft />
        <div className="pp-hero-center">
          <p className="pp-eyebrow">Credit and reputation rail</p>
          <h1 className="pp-brand">Proofport</h1>
          <p className="pp-tagline">
            Bola can prove she is verified
            <br />
            without proving <em>who</em> she is.
          </p>
          <p className="pp-tagline-sub">
            Prove privately. Move funds on a boolean. Attest onchain, never PII.
          </p>
          <div className="pp-hero-ctas">
            <button
              type="button"
              className="pp-btn-dark pp-btn-lg"
              disabled={running || authorityLocked}
              onClick={() => void run()}
            >
              {running
                ? "Running pipeline"
                : authorityLocked
                  ? "Grant authority first"
                  : "Open the cash-out demo"}
            </button>
            <a className="pp-link-demo" href="#how">
              See the rail
            </a>
          </div>
        </div>
        <HeroArtRight />
      </header>

      <section className="pp-how" id="how" data-reveal>
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
              A licensed partner would re-verify the proof. We stop at
              settlement_initiated. No naira leaves this app.
            </p>
          </li>
        </ol>
      </section>

      <section className="pp-agents" id="agents" data-reveal>
        <article className="pp-agent-card">
          <p className="pp-section-kicker">Proof agent</p>
          <h3>Credentials only</h3>
          <p>
            Holds IdentityVC and ProvenanceVC. Can present and check
            delegation. Cannot touch funds.
          </p>
          <ul>
            <li>Present proof</li>
            <li>Check authority</li>
            <li className="deny">Cannot swap or send funds</li>
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
            <li>Swap on Uniswap</li>
            <li>Pay the compliance fee</li>
            <li>Request hand-off</li>
            <li className="deny">Cannot read name, ID, or country</li>
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
        <section className="pp-rail" aria-label="Live rail" data-reveal>
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
            <strong>
              <a
                href={`${explorer}/address/${swapRouter}`}
                target="_blank"
                rel="noreferrer"
              >
                {rail.swapLabel ?? "Uniswap V3 on Base Sepolia"}
              </a>
            </strong>
          </div>
          <div>
            <span>Authority</span>
            <strong>Grant/Revoke live; local key</strong>
          </div>
          <div>
            <span>Bank</span>
            <strong>{rail.partner}</strong>
          </div>
        </section>
      )}

      <section className="pp-ask" id="demo" aria-label="Run the cash-out" data-reveal>
        <p className="pp-section-kicker">What is real on this run</p>
        <ul className="pp-honesty" aria-label="What is real on this run">
          {honestyLegend.map((row) => (
            <li key={row.text} data-honesty={row.honesty}>
              {row.text}
            </li>
          ))}
        </ul>
        <a className="pp-proof-cta" href="/proof">
          Don&rsquo;t take our word for it &mdash; verify every claim on-chain
          from your own browser &rarr;
        </a>
        <h2 className="pp-section-title">Cash-out wedge</h2>
        <p className="pp-ask-lead">
          Two agents split by capability. Private proof, public hash, revocable
          authority. The bank stays off our books on purpose. Grant, then run.
          {rail?.dynamic?.note ? ` ${rail.dynamic.note}` : ""}
        </p>
        <div className="pp-fields">
          <label>
            Recipient
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label>
            Amount USD
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
            />
          </label>
          <label>
            Country
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
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
            disabled={running || authorityLocked}
            onClick={() => void run()}
          >
            {running
              ? "Running pipeline"
              : authorityLocked
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
              {(done || running) && (
                <span
                  className="pp-honesty-pill"
                  data-honesty={
                    beat.id === "swap"
                      ? swapBeatLive
                        ? "live"
                        : "sim"
                      : beat.honesty
                  }
                >
                  {beat.id === "swap"
                    ? swapBeatLive
                      ? beat.liveLabel
                      : "Internal fallback"
                    : beat.honestyLabel}
                </span>
              )}
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
            {reputation?.subject && (
              <>
                {" "}
                <a href={`/lender?subject=${reputation.subject}`}>
                  Open lender terminal
                </a>
              </>
            )}
          </p>
        </div>
      )}

      <main className="pp-modules" ref={resultsRef} id="results" data-reveal>
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
            {result?.disclosure
              ? `${result.disclosure.rationale} (${result.disclosure.source})`
              : "Only verified and country leave the device unless the proof-agent picks over_18. Full name and ID never enter the presentation."}
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
                        ? "Private"
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

        <section className="pp-module pp-module-mpc">
          <div className="pp-module-head">
            <h2 className="pp-module-title">Delegated authority</h2>
            <span className="pp-chip">
              {mpcOut?.live
                ? "Dynamic MPC"
                : rail?.dynamic?.signer === "dynamic_mpc"
                  ? "Signer live"
                  : "Local key"}
            </span>
          </div>
          <p className="pp-module-lead">
            {mpcOut?.live
              ? "The Dynamic server wallet signed this run itself. The sender below is the MPC wallet, not our local key."
              : mpcOut?.note
                ? mpcOut.note
                : "Grant gives the agent authority over a Dynamic MPC server wallet. Run the demo to make it sign."}
          </p>
          <div className="pp-kv">
            <div>
              <span>Signer</span>
              <strong className={mpcOut?.live ? "ok" : ""}>
                {mpcOut?.live
                  ? "Dynamic MPC (threshold)"
                  : rail?.dynamic?.signer === "dynamic_mpc"
                    ? "Dynamic MPC ready"
                    : "local viem"}
              </strong>
            </div>
            <div>
              <span>Sender onchain</span>
              <strong className="pp-mono">
                {mpcOut?.from ?? rail?.dynamic?.mpcAddress
                  ? shortAddr(
                      (mpcOut?.from ?? rail?.dynamic?.mpcAddress) as string,
                    )
                  : "Waiting for run"}
              </strong>
            </div>
            <div>
              <span>MPC signature</span>
              <strong>
                {mpcOut?.explorerUrl ? (
                  <a href={mpcOut.explorerUrl} target="_blank" rel="noreferrer">
                    {mpcOut.txHash ? `${mpcOut.txHash.slice(0, 10)}…` : "Basescan"}
                  </a>
                ) : rail?.dynamic?.mpcProof?.explorerUrl ? (
                  <a
                    href={rail.dynamic.mpcProof.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {`${rail.dynamic.mpcProof.txHash.slice(0, 10)}…`}
                  </a>
                ) : (
                  "Waiting for run"
                )}
              </strong>
            </div>
            <div>
              <span>Our local key</span>
              <strong className={mpcOut?.live ? "ok" : ""}>
                {mpcOut?.live ? "Not used for this tx" : "Signs swap + attestation"}
              </strong>
            </div>
          </div>
          <a className="pp-proof-cta" href="/proof">
            Verify this sender on-chain yourself &rarr;
          </a>
        </section>

        <section className="pp-module pp-module-dark">
          <h2 className="pp-module-title">Capability block</h2>
          <p className="pp-module-lead">
            Each agent is missing a power on purpose. Code throws. Not a prompt.
          </p>
          <ul className="pp-rows">
            {(capabilityBlocks.length
              ? capabilityBlocks.map((b, i) => ({
                  agent: b.agent === "proof" ? "Proof" : "Execution",
                  line:
                    b.toolName === "attempt_swap"
                      ? "Cannot swap or send funds"
                      : "Cannot read name, ID, or country",
                  color: ["#0090ff", "#9f4fff"][i % 2],
                }))
              : DENIALS_IDLE
            ).map((b) => (
              <li key={`${b.agent}-${b.line}`} className="pp-row">
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
                    {b.agent} agent
                    <em>{b.line}</em>
                  </span>
                </div>
                <span className="pp-row-meta">
                  {capabilityBlocks.length ? "Blocked" : "Will block"}
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
              <span>Subject</span>
              <strong className="pp-mono">
                {reputation?.subject ? (
                  <a href={`/lender?subject=${reputation.subject}`}>
                    {shortAddr(reputation.subject)}
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
          {recentAttestations.length > 0 && (
            <ul className="pp-rows" style={{ marginTop: 16 }}>
              {recentAttestations.slice(-5).map((item) => (
                <li key={item.subject} className="pp-row">
                  <span className="pp-row-name pp-mono">
                    {shortAddr(item.subject)}
                  </span>
                  <span className="pp-row-meta">
                    {item.creditEligible ? (
                      <a href={`/lender?subject=${item.subject}`}>Lender</a>
                    ) : (
                      "not on chain yet"
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pp-module pp-module-settle">
          <h2 className="pp-module-title">Settlement</h2>
          <div className="pp-kv">
            <div>
              <span>Swap</span>
              <strong>
                {swapOut?.provider === "uniswap"
                  ? swapOut.via === "trading-api"
                    ? "Uniswap Trading API on Base Sepolia"
                    : "Uniswap V3 on Base Sepolia"
                  : swapOut?.provider
                    ? "Internal fallback"
                    : "ETH to USDC (pending)"}
              </strong>
              {swapFallbackNote && <p className="muted">{swapFallbackNote}</p>}
              {swapOut?.note && swapOut.provider === "uniswap" && (
                <p className="muted">{swapOut.note}</p>
              )}
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

      <footer className="pp-footer" data-reveal>
        <div className="pp-footer-inner">
          <div className="pp-footer-brand">
            <div className="pp-footer-logo" aria-hidden="true">
              <BrandMark className="pp-footer-mark" />
            </div>
            <div>
              <p className="pp-footer-name">Proofport</p>
              <p className="pp-footer-tag">
                Prove privately. Move funds on a boolean.
              </p>
            </div>
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
                    <button
                      type="button"
                      className="pp-footer-run"
                      disabled={running || authorityLocked}
                      onClick={() => void run()}
                    >
                      Watch the demo
                    </button>
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
                    <a href="/lender">Lender terminal</a>
                  </li>
                  <li>
                    <a href="/proof">Proof wall</a>
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
                    <span>
                      {rail?.dynamic?.signer === "dynamic_mpc"
                        ? "Grant/Revoke live; Dynamic MPC signing"
                        : "Grant/Revoke live; local key"}
                    </span>
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
