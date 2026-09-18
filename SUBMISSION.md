# Submission copy (Phase 9)

**Video recording and the official Runtime / Uniswap form POSTs remain manual.** This file is paste-ready copy plus the audit. Do not check Phase 10 until those human steps exist.

Paste hashes from receipts we re-checked on Base Sepolia RPC (`status=success`). Do not invent new ones during the form fill.

---

## (a) Runtime submission form — paste this

**Project name:** Proofport

**One sentence:** Two agents split by capability. Private proof, public hash, revocable authority. The bank stays off our books on purpose.

**What we built (exact answer):**

Proofport is a constrained-agent credit-and-reputation rail, not a consumer cash-out app and not a money transmitter.

A proof-agent issues an SD-JWT VC and discloses only allowlisted claims (`verified`, plus `country` or `over_18`). Name and ID stay withheld in the presentation. An execution-agent never reads those fields. Each agent is blocked from the other’s tools by a hard throw in the tool registry (`denyCapability`).

When the proof verifies, the execution-agent (local viem key `0x0afC983C15444DFDaaD76aBF22f1D1053035AE67`) does three things that are actually wired:

1. A tiny ETH→USDC fill on Uniswap V3 SwapRouter02, Base Sepolia. Confirmed tx [`0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3`](https://sepolia.basescan.org/tx/0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3) (pool sent `0.395801` USDC).
2. A PII-free reputation attestation (`subject` / `kind` / `evidenceHash`) on `0xac188e1e9d624b346006dfe233290751165f2f16`. Example writes: [`0xd546a412a54646441b33990c3bd91854e6fe65d04ee97ca7eb1a73979c7cdef8`](https://sepolia.basescan.org/tx/0xd546a412a54646441b33990c3bd91854e6fe65d04ee97ca7eb1a73979c7cdef8), [`0xbc34142f695e60d23499b06f7297853ca25ff70d57640046d696cef6adbbaccf`](https://sepolia.basescan.org/tx/0xbc34142f695e60d23499b06f7297853ca25ff70d57640046d696cef6adbbaccf). A lender page at `/lender` reads that hash only.
3. App-level Grant / Revoke (cookie + file). Revoke blocks the run.

**What is not live (do not imply otherwise):**

- Identity issuer: local mock keypair. No government NIN/BVN.
- Licensed partner / bank: `MockLicensedPartner` returns `settlement_initiated`. No fiat moves.
- x402: 402 → payment header → 200 is demonstrable; the body is `mock_compliance`. We have no ExactEvmScheme settlement tx.
- Dynamic MPC: blocked upstream (`signTransaction` timed out). Grant/Revoke is app-level. Execution signs with the local key above. Tx [`0x2ebe2f1a68f1366d3809d720c1100f0feac90bf1d60eff4e64b5a5384fa09242`](https://sepolia.basescan.org/tx/0x2ebe2f1a68f1366d3809d720c1100f0feac90bf1d60eff4e64b5a5384fa09242) is that local key funding a Dynamic address — not an MPC signature.
- Uniswap Trading API: unused. Live path is SwapRouter02.

**Tracks:** Uniswap — yes, with the SwapRouter02 fill above. Dynamic — no MPC signing on-chain; say so.

**Repo / video:** paste your public GitHub URL and the 90s mp4 after you record them. Shot-list: [`demos/proofport-one-take.md`](demos/proofport-one-take.md).

---

## (b) Uniswap Developer Feedback Form — paste this

**What did you integrate?**

Uniswap V3 on Base Sepolia via SwapRouter02 + QuoterV2, not the Trading API.

- Router `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4`
- QuoterV2 `0xC5290058841028F1614F3A6F0F5816cAd0df5E27`
- Code: `src/swap/uniswap.ts` — `quoteExactInputSingle` L74–88, `exactInputSingle` calldata L190–194, `writeContract multicall(deadline)` L211–217
- Fallback: labeled mock only if quote/swap throws (`src/swap/index.ts` L59–75)

**Live fill (receipt success):**

[`0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3`](https://sepolia.basescan.org/tx/0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3)

From `0x0afC983C15444DFDaaD76aBF22f1D1053035AE67` to SwapRouter02. Pool `0x46880b404CD35c165EDdefF7421019F8dD25F4Ad` sent `0.395801` USDC; router sent `0.0001` WETH to the pool.

Earlier same-router fills: [`0xa6c9a6ac…097e20`](https://sepolia.basescan.org/tx/0xa6c9a6ac09b3ac702d509b8ccd67441d848ca763d3dae6b62c92fc337a097e20), [`0x86916457…448c5`](https://sepolia.basescan.org/tx/0x8691645781a0ca62d2f93a07d792e73bb1d0764f10c2dfa7ffc66127439448c5).

**What was hard / feedback:**

1. Testnet liquidity, not contract availability, is the blocker. Empty pools break agent demos. Seeded WETH/USDC on hackathon chains would help.
2. Trading API 404’d for ETH/USDC on Base Sepolia (chain 84532) even with a valid key. We did not use it. SwapRouter02 filled.
3. SwapRouter02 `exactInputSingle` has no `deadline` field; deadline is on `multicall(uint256 deadline, bytes[])`. Older ISwapRouter snippets still circulate and waste time.
4. A one-page “server wallet exactInputSingle on Base Sepolia” recipe (addresses + ABI + multicall) would cut agent integration time.

**Repo:** same public GitHub URL as Runtime. Longer write-up: [`FEEDBACK.md`](FEEDBACK.md).

---

## Commands (local, optional)

```bash
npm run dev
npm run smoke:credentials
npm run smoke:agent
npm run smoke:x402
npm run smoke:partner
npm run smoke:swap
npm run smoke:delegation
npm run smoke:wallet
```
