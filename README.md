# Proofport

> Two agents split by capability. Private proof, public hash, revocable authority. The bank stays off our books on purpose.

Onchain credit-and-reputation rail for agentic finance. A proof-agent discloses only the claims a counterparty needs. An execution-agent moves value on a verifier boolean and never reads identity. Successful proofs become a PII-free attestation on Base Sepolia.

Built for Runtime (Bankr × Propaganda). **Not** a consumer cash-out app. We are deliberately not a money transmitter.

## What is LIVE vs SIMULATED

| Surface | Status | Why |
| --- | --- | --- |
| SD-JWT selective disclosure | **LIVE** | Cryptographic withholding via `@sd-jwt/sd-jwt-vc` |
| Capability denials | **LIVE** | Hard throw in the tool registry, not a prompt |
| Reputation attestation | **LIVE** | Base Sepolia contract, hashes only, no PII |
| Revocable authority | **LIVE** (app-level) | Grant / Revoke cookie + file gate |
| x402 402 → retry | **LIVE header / SIMULATED result** | Protocol loop is real; compliance body is mock |
| ID issuer (NIN/BVN stand-in) | **SIMULATED** | Legal / no government issuer |
| Licensed partner / bank | **SIMULATED** | Legal: we do not move fiat |
| Uniswap swap | **LIVE** on Base Sepolia (tiny ETH→USDC) | Testnet. Trading API first when `UNISWAP_API_KEY` is set; SwapRouter02 if the API cannot route. Mock only if both fail, and then labeled. |
| Dynamic Neon MPC | **SIMULATED / incomplete on Windows** | SDK is darwin/linux; local viem wallets |

Full ledger: [`MOCKS.md`](MOCKS.md).

## Where to look

| What | File |
| --- | --- |
| SD-JWT `present()` selective disclosure | [`src/credentials/index.ts`](src/credentials/index.ts) ~L154 |
| Capability-denial throw | [`src/agents/capability.ts`](src/agents/capability.ts) `denyCapability` ~L17 |
| Reputation write / read | [`src/reputation/index.ts`](src/reputation/index.ts) `writeAttestation` ~L103, `readAttestation` / `getAttestation` ~L169 |
| Contract | [`contracts/ReputationAttestation.sol`](contracts/ReputationAttestation.sol) |
| Orchestrator | [`src/orchestrator/index.ts`](src/orchestrator/index.ts) |
| Dual wallets | [`src/wallet/dual.ts`](src/wallet/dual.ts) |
| Lender (chain-only) | [`src/app/lender/page.tsx`](src/app/lender/page.tsx) · [`src/app/api/reputation/route.ts`](src/app/api/reputation/route.ts) |

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
