"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ReadResult = {
  subject: string;
  kind: string;
  evidenceHash: string;
  attestedAt: string;
  attester: string;
  piiFields: string[];
  creditEligible: boolean;
  acknowledgement: string;
  error?: string;
};

function short(v: string) {
  if (v.length < 18) return v;
  return `${v.slice(0, 8)}…${v.slice(-6)}`;
}

function LenderInner() {
  const params = useSearchParams();
  const [subject, setSubject] = useState(params.get("subject") ?? "");
  const [data, setData] = useState<ReadResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explorer = useMemo(() => {
    if (!data?.attester || data.attester.startsWith("0x0000")) {
      return "https://sepolia.basescan.org";
    }
    return `https://sepolia.basescan.org/address/${data.attester}`;
  }, [data]);

  async function lookup(next = subject) {
    const hex = next.trim();
    if (!hex) {
      setError("Enter a subject id (bytes32).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reputation?subject=${encodeURIComponent(hex)}`,
      );
      const json = (await res.json()) as ReadResult;
      if (!res.ok) {
        setData(null);
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const fromUrl = params.get("subject");
    if (fromUrl) void lookup(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pp-shell">
      <nav className="pp-nav" aria-label="Lender">
        <div className="pp-nav-brand">
          <img
            className="pp-nav-mark"
            src="/proofport-mark.png"
            alt=""
            width={32}
            height={32}
          />
          <p className="pp-nav-name">Proofport</p>
        </div>
        <a className="pp-link-demo" href="/">
          Back to demo
        </a>
      </nav>
      <header className="pp-hero" style={{ minHeight: 0 }}>
        <div className="pp-hero-center">
          <p className="pp-eyebrow">Lender terminal</p>
          <h1 className="pp-brand">Read the hash</h1>
          <p className="pp-tagline">
            Independent chain read. This screen does not trust the demo app
            state.
          </p>
        </div>
      </header>
      <section className="pp-ask" aria-label="Look up attestation">
        <div className="pp-fields">
          <label>
            Subject id
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        </div>
        <div className="pp-ask-actions">
          <button
            type="button"
            className="pp-btn-dark pp-btn-lg"
            disabled={busy}
            onClick={() => void lookup()}
          >
            {busy ? "Reading chain" : "Read attestation"}
          </button>
        </div>
        {error && <p className="pp-error">{error}</p>}
      </section>
      {data && (
        <section className="pp-module" aria-live="polite">
          <div className="pp-module-head">
            <h2 className="pp-module-title">Onchain record</h2>
            <span className="pp-chip">
              Credit eligible: {data.creditEligible ? "yes" : "no"}
            </span>
          </div>
          <p className="pp-module-lead">
            {data.creditEligible
              ? `Valid attestation. Acknowledgement: ${data.acknowledgement}.`
              : "No attestation at this subject (attestedAt is zero)."}
          </p>
          <div className="pp-kv">
            <div>
              <span>Subject</span>
              <strong className="pp-mono">{short(data.subject)}</strong>
            </div>
            <div>
              <span>Evidence</span>
              <strong className="pp-mono">{short(data.evidenceHash)}</strong>
            </div>
            <div>
              <span>Attested at</span>
              <strong>{data.attestedAt}</strong>
            </div>
            <div>
              <span>Attester</span>
              <strong>
                <a href={explorer} target="_blank" rel="noreferrer">
                  {short(data.attester)}
                </a>
              </strong>
            </div>
            <div>
              <span>PII fields</span>
              <strong>
                {data.piiFields.length ? data.piiFields.join(", ") : "none"}
              </strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function LenderPage() {
  return (
    <Suspense
      fallback={
        <div className="pp-shell">
          <p className="pp-ask-lead">Loading lender terminal…</p>
        </div>
      }
    >
      <LenderInner />
    </Suspense>
  );
}
