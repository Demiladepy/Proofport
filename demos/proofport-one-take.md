# 90-second shot-list

Recording is manual. This is the script. Do not mark the submission done until the mp4 exists.

Never say the word that means "LLM instruction." Capability denials are a **hard throw in the tool registry**.

---

## The rule this script follows

**Lead with the receipt, not the apology.** A judge is skimming dozens of
submissions and decides in about five seconds whether to keep watching. The old
version of this script opened with ten seconds of "here is what is mocked" —
honest, but it spends your only chance at attention on a disclaimer. Honesty is
your differentiator, so it still goes in, but at second 10, framed as strength,
not as a confession.

---

## Pre-flight (do all of this before you hit record)

```bash
npm run mpc:serve    # leave running in its own terminal
npm run dev
```

- [ ] `npm run mpc:serve` is running. Without it the authority chip correctly reads `local_viem` and your Dynamic claim is not on screen.
- [ ] Load `/` and confirm the chip reads **"Grant/Revoke governs Dynamic MPC wallet 0xA838…EA77, which signs on-chain."**
- [ ] Load `/proof` once and confirm **5 of 5 claims verified**.
- [ ] Authority is **granted** before you start (you revoke on camera later).
- [ ] Browser at 100% zoom, no DevTools, no notifications, bookmarks bar hidden.
- [ ] Two tabs ready: `/proof` and `/`.

---

## 0–10s — Open on the proof, already moving

Start on **`/proof`** with the rows mid-verification, flipping green one by one.
Do not start on the hero. Say:

> Everything I am about to claim is already on-chain — and your own browser is
> checking it right now. Not my server. I am not in the request path.

Let one row land visibly on **VERIFIED** before you move. That is the hook.

## 10–20s — The thesis, and the honesty as a flex

Scroll to the black **"What we are deliberately not claiming"** block at the
bottom of `/proof`. Say:

> Two agents split by capability. Private proof, public hash, revocable authority.
> And here is every mock in the build, labelled, in the same place as the proof.
> No fiat moves. We are deliberately not a money transmitter.

This is the line most submissions cannot say. Say it with confidence, not apology.

## 20–32s — Grant, then run

Switch to **`/`**. Click **Grant**. Click **Open the cash-out demo** (this starts
the pipeline — do not use the nav Demo link). Stay on the cream panel.

> One click of Grant, and the agent has authority. Watch what it can and cannot do.

## 32–46s — Selective disclosure (LIVE)

On **Disclose**: `verified` and `country` open, name and ID stay locked.

> The counterparty learns that this person is verified. It never learns who they
> are. Name and ID are not hidden by the interface — they are cryptographically
> absent from the presentation.

## 46–58s — Capability denials (LIVE)

On **Bound**: point at the two denial lines.

> The proof-agent cannot move money. The execution-agent cannot read identity.
> That is not a policy we asked a model to follow — it is a throw in the tool
> registry. The call does not return.

## 58–72s — Dynamic MPC + attestation (LIVE)

On the trace, point at **`dynamic_mpc_sign`**, then open its explorer link.

> That transaction was signed by a Dynamic MPC wallet. Look at the sender — it is
> the server wallet, not my key. I could not have forged that field.

Then **Attest**, and click through to **`/lender`**.

> The lender reads one hash and returns credit eligible. No name, no ID, nothing
> reversible.

If Swap shows Uniswap on Base Sepolia, that is the live AMM fill. Do not call a
labelled fallback a Uniswap fill.

## 72–90s — Revoke, and close

Back to the demo. Click **Revoke**. Try to run — it is blocked.

> Authority is revocable, and revoking stops the machine before anything signs.

Close on:

> Two agents split by capability. Private proof, public hash, revocable
> authority. The bank stays off our books on purpose.

Stop recording. Do not claim a bank transfer. Do not claim the Revoke gate is
enforced on-chain — it is an app-level gate over an MPC wallet.

---

## If you fluff a take

Do not restart from zero. The only shots that must be continuous are 20–32
(Grant → run) and 72–90 (Revoke → blocked). Everything else can be cut together.
Re-record the single beat you lost.

## Console

No DevTools errors during the take.
