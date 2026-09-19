# Proofport

> Two agents split by capability. Private proof, public hash, revocable authority. The bank stays off our books on purpose.

Onchain credit-and-reputation rail for agentic finance. A proof-agent discloses only the claims a counterparty needs. An execution-agent moves value on a verifier boolean and never reads identity. Successful proofs become a PII-free attestation on Base Sepolia.

Built for Runtime (Bankr × Propaganda). **Not** a consumer cash-out app. We are deliberately not a money transmitter.

## For judges — read this first

**The chain is the proof. The hosted URL is the walkthrough.** Every claim below
is verifiable from any browser via Base Sepolia explorer links, with no setup and
no trust in us. If the hosted demo is asleep, the receipts still stand.

### Verify in 60 seconds, without running anything

| Track | Claim | Open this | Look for |
| --- | --- | --- | --- |
| **Uniswap** | Real V3 fill via SwapRouter02 | [`0xd4ddc55d…1346d3`](https://sepolia.basescan.org/tx/0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3) | `to` = SwapRouter02 `0x94cC0AaC…`; pool sent `0.395801` USDC |
| **Dynamic** | An MPC server wallet signed its own tx | [`0x85fd02dd…465d04`](https://sepolia.basescan.org/tx/0x85fd02dd919213773d969ba998aac04533750aa31fc987c0e31e6cd633465d04) | **`from` = `0xA83850aB…EA77`** — the Dynamic wallet, not our key |
| **Dynamic** | It was that wallet's first-ever tx | [`0xd96b57f6…c8c9e1`](https://sepolia.basescan.org/tx/0xd96b57f60add3852d684676343a0528947f380b9fdea65d85661f1b473c8c9e1) | `nonce = 0` from the same address |
| **Runtime** | Reputation attestation carries no PII | [`0xd546a412…cdef8`](https://sepolia.basescan.org/tx/0xd546a412a54646441b33990c3bd91854e6fe65d04ee97ca7eb1a73979c7cdef8) | Input is `subject` / `kind` / `evidenceHash` — three hashes, no name, no ID |

That Dynamic `from` field is the whole claim. A local private key cannot produce it.

### What works on the hosted URL

Grant → run the pipeline → selective disclosure, both capability denials, the
Uniswap leg, the on-chain attestation, `/lender` reading chain-only, then Revoke
blocking the run. Every step is labeled Simulated or Live on screen.

### What is local-only, and why

**Dynamic MPC signing does not run on the hosted deploy.** `@dynamic-labs-wallet/node`
ships MPC binaries for linux/macos only, and the signer holds key shares that are
gitignored and never deployed — putting them in a hosting env var would be the
wrong call. So the hosted app reports `signer: "local_viem"` and says so on screen.
**It never claims MPC it cannot currently perform.** The signatures in the table
above already happened; the explorer is the receipt.

To reproduce it yourself (Linux, or Windows + WSL):

```bash
npm run mpc:serve   # sidecar on 127.0.0.1:18787
npm run mpc:sign    # one signature -> .data/dynamic-mpc-proof.json
```

`mpc:sign` prints the tx hash. Check `from` on the explorer — it is the Dynamic
wallet. With `mpc:serve` running, the full app run signs through it too, and the
authority chip flips to "Grant/Revoke governs Dynamic MPC wallet … which signs on-chain."

### What we are not claiming

No fiat moves. No bank API. No money transmission. The licensed-partner leg is
`MockLicensedPartner` and is labeled **SIMULATED** everywhere it appears — that is a
deliberate legal boundary, not an unfinished feature. Full ledger: [`MOCKS.md`](MOCKS.md).

---

## What is LIVE vs SIMULATED

Statuses match [`MOCKS.md`](MOCKS.md) exactly. Every LIVE row there has a tx hash or file+line.

| Surface | Status | Why |
| --- | --- | --- |
| SD-JWT selective disclosure | **LIVE** | Cryptographic withholding via `@sd-jwt/sd-jwt-vc` ([`src/credentials/index.ts`](src/credentials/index.ts) `present` L154–184) |
| Capability denials | **LIVE** | Hard throw in the tool registry ([`src/agents/capability.ts`](src/agents/capability.ts) `denyCapability` L17) |
| Reputation attestation | **LIVE** | Base Sepolia `0xac188e1e…f16`, hashes only. Example write [`0xd546a412…cdef8`](https://sepolia.basescan.org/tx/0xd546a412a54646441b33990c3bd91854e6fe65d04ee97ca7eb1a73979c7cdef8) |
| Lender chain read | **LIVE** | [`/lender`](/lender) · `GET /api/reputation` |
| Revocable authority | **LIVE** (app-level Grant/Revoke) | Cookie + file gate, not an on-chain policy contract. Binds to the Dynamic MPC wallet when the signer is up; Revoke blocks the run before anything signs. |
| Execution-agent signing | **LIVE** | Swap + attestation signed by local viem key `0x0afC983C…`. The authority-proof step in the same run is signed by the Dynamic MPC wallet. |
| Dynamic server-wallet MPC sign | **LIVE** (needs a Linux runtime) | Server wallet `0xA83850aB…` signs on-chain. Agent-run tx [`0x85fd02dd…465d04`](https://sepolia.basescan.org/tx/0x85fd02dd919213773d969ba998aac04533750aa31fc987c0e31e6cd633465d04) — `from` is the MPC wallet. The SDK has no win32 MPC binary, so signing runs in WSL (`npm run mpc:serve`); with it down the app reports `local_viem` and says so. |
| x402 402 → retry | **LIVE header / SIMULATED result** | Protocol loop is real; body is `mock_compliance`. No ExactEvmScheme settlement tx. |
| ID issuer (NIN/BVN stand-in) | **SIMULATED** | Legal / no government issuer |
| Licensed partner / bank | **SIMULATED** | Legal: we do not move fiat |
| OpenAI claim pick | **MIXED** | Allowlisted model pick when keyed; otherwise labeled fallback |
| Uniswap Trading API | **UNUSED** | Auto path is SwapRouter02. Trading API 404’d on Base Sepolia ETH/USDC. |
| Uniswap swap | **LIVE** on Base Sepolia (tiny ETH→USDC) | SwapRouter02 fill [`0xd4ddc55d…1346d3`](https://sepolia.basescan.org/tx/0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3). Calldata [`src/swap/uniswap.ts`](src/swap/uniswap.ts) L190–194, broadcast L211–217. Mock only if that path throws. |

Full ledger with every citation: [`MOCKS.md`](MOCKS.md). Form paste + shot-list: [`SUBMISSION.md`](SUBMISSION.md).

## Where to look

| What | File |
| --- | --- |
| SD-JWT `present()` / `verify()` | [`src/credentials/index.ts`](src/credentials/index.ts) L154–184 / L194–216 |
| Capability-denial throw | [`src/agents/capability.ts`](src/agents/capability.ts) `denyCapability` L17–22; orchestrator L139–152 |
| Reputation write / read | [`src/reputation/index.ts`](src/reputation/index.ts) `writeAttestation` L103, `attest` L137–142, `readAttestation` L169 |
| Contract | [`contracts/ReputationAttestation.sol`](contracts/ReputationAttestation.sol) at `0xac188e1e9d624b346006dfe233290751165f2f16` |
| Grant / Revoke | [`src/delegation/index.ts`](src/delegation/index.ts) L74 / L87; [`src/app/api/delegation/route.ts`](src/app/api/delegation/route.ts) POST L31 |
| Dynamic MPC signer (Linux sidecar) | [`scripts/dynamic-wsl-signer.mjs`](scripts/dynamic-wsl-signer.mjs) `signAndSend` L105–152 · one-shot [`scripts/dynamic-mpc-sign.mjs`](scripts/dynamic-mpc-sign.mjs) |
| Dynamic MPC app client | [`src/wallet/dynamic-mpc.ts`](src/wallet/dynamic-mpc.ts) `mpcSignAndSend` L77 · `probeMpcSigner` L52 |
| Dynamic rail status (real signer, not hardcoded) | [`src/wallet/dynamic-status.ts`](src/wallet/dynamic-status.ts) `getDynamicRailStatus` L43 |
| Orchestrator | [`src/orchestrator/index.ts`](src/orchestrator/index.ts) |
| Uniswap SwapRouter02 fill | [`src/swap/uniswap.ts`](src/swap/uniswap.ts) QuoterV2 L74–88, `exactInputSingle` L190–194, `multicall(deadline)` L211–217 |
| Dual wallets / execution key | [`src/wallet/dual.ts`](src/wallet/dual.ts) `getExecutionPrivateKey` L32 |
| OpenAI claim pick (mixed) | [`src/agents/proof-agent/select-claims.ts`](src/agents/proof-agent/select-claims.ts) L35 |
| Lender (chain-only) | [`src/app/lender/page.tsx`](src/app/lender/page.tsx) · [`src/app/api/reputation/route.ts`](src/app/api/reputation/route.ts) GET L23 |
| x402 header loop / mock body | [`src/payments/x402.ts`](src/payments/x402.ts) L86–135 · [`src/app/api/compliance-check/route.ts`](src/app/api/compliance-check/route.ts) L14–21 |
| Partner (simulated) | [`src/partner/index.ts`](src/partner/index.ts) `requestPartnerHandoff` L31 |

## Demo

Grant authority, then **Open the cash-out demo** (starts the pipeline; it is not a same-page dummy link). Every step is labeled Simulated or Live. Revoke locks the run.

Lender terminal (chain read only): [`/lender`](/lender).

## Stack

Next.js 16 · TypeScript · viem · Base Sepolia · `@sd-jwt/sd-jwt-vc` · x402 · optional OpenAI for one proof-agent claim decision.

## Quick start

Node 22+.

```bash
cp .env.example .env
npm install
npm run compile:reputation
npm run deploy:reputation
npm run dev
```

Fund the execution wallet on Base Sepolia (ETH + Circle USDC). Set `EXECUTION_AGENT_PRIVATE_KEY` or `DEMO_AGENT_PRIVATE_KEY`. Never commit `.env`.

### Dynamic MPC signer (Linux only)

`@dynamic-labs-wallet/node` ships MPC executors for linux/macos only — there is
no win32 binary, so Next.js on Windows cannot sign in-process. The signer runs
out-of-process and the app talks to it over localhost:

```bash
npm run mpc:serve
```

On Windows that shells into WSL; on Linux run `bash scripts/start-dynamic-wsl.sh`.
It bootstraps a Linux-native SDK install in `~/proofport-mpc` on first run (npm
resolution over the `/mnt/c` 9p mount is unusably slow), then listens on
`127.0.0.1:18787` with `GET /health` and `POST /sign`.

For a single signature without the server:

```bash
npm run mpc:sign
```

Both write the receipt to `.data/dynamic-mpc-proof.json`. With the signer down
the app reports `signer: "local_viem"` and the UI says so — it never claims MPC
it cannot currently perform.

## Scripts

```bash
npm run smoke:credentials
npm run smoke:capability
npm run smoke:wallet
npm run smoke:reputation
npm run smoke:x402
npm run smoke:partner
npm run smoke:delegation
npm run smoke:swap
npm run smoke:agent
```

## License

Private hackathon build for Runtime AgentWeek unless the owner states otherwise.
