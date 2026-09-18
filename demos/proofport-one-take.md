# Phase 9 demo recording (PRD v2)

Video recording is **manual**. This is the shot-list only. Do not mark Phase 10 done until the mp4 exists.

Never say the word that means “LLM instruction.” Capability denials are a **hard throw in the tool registry**.

## 90s shot-list (keyed to LIVE features)

### 0–10s — Label every mock first

Cream hero. Point at the honesty chips **before** you run anything. Say, out loud:

> Identity issuer is demo — no government ID. Bank payout is not sent from this app. The compliance body is mock. What is live: private proof, agent bounds, Uniswap on Base Sepolia, an onchain hash with no PII, Grant and Revoke, and a Dynamic MPC wallet that signs its own transaction.

**Before recording, start the MPC signer** (`npm run mpc:serve`) and reload, or the authority chip will correctly read `local_viem` and the Dynamic claim will not be on screen.

Do not click yet.

### 10–25s — Grant, then run

Click **Grant**. Click **Open the cash-out demo** (starts the pipeline; do not use nav Demo). Stay on the cream panel.

### 25–40s — Selective disclosure (LIVE)

On **Disclose**: verified (and country or over_18) are open. Name and ID stay locked. Say: private proof — only the claims the counterparty needs.

### 40–55s — Capability denials (LIVE)

On **Bound**: two hard denials. Proof cannot swap. Execution cannot read name, ID, or country. Point at those two lines.

### 55–70s — Onchain attestation + lender (LIVE)

On **Attest**: reputation tx + subject. Open the explorer link if it is on screen. Click **Open lender terminal** (`/lender`). Credit eligible: yes. No PII. Say: public hash, not identity.

If Swap shows Uniswap on Base Sepolia, that is the live AMM fill. Do not call a labeled fallback a Uniswap fill.

### 70–90s — Dynamic MPC + Grant / Revoke (LIVE)

On the trace, point at **dynamic_mpc_sign**. Open its explorer link: `from` is the
Dynamic server wallet `0xA83850aB…`, not our key. Say: the delegated wallet signed
that itself.

Back to the demo. Click **Revoke**. Try run — blocked before anything signs. Click
**Grant**. Close on the footer line:

> Two agents split by capability. Private proof, public hash, revocable authority. The bank stays off our books on purpose.

Stop. Do not claim a bank transfer. Do not claim the Revoke gate is enforced
on-chain — it is an app-level gate over an MPC wallet.

## Spoken line (one take)

> Two agents split by capability. Private proof, public hash, revocable authority. The bank stays off our books on purpose.

## Console

No DevTools errors during one-take. Phase 10 stays unchecked until the mp4 and forms exist.
