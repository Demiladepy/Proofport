# Proofport

Onchain **credit & reputation rail** for agentic finance. Two capability-bounded agents: a **proof-agent** that selectively discloses SD-JWT credentials, and an **execution-agent** that moves funds on a verifier boolean. After a successful cash-out wedge, a PII-free **reputation attestation** lands on Base Sepolia.

Built for Runtime (Bankr × Propaganda) · Dynamic + Uniswap tracks.

## Quick start

```bash
cp .env.example .env
npm install
npm run compile:reputation
npm run deploy:reputation   # needs EXECUTION_AGENT_PRIVATE_KEY / DEMO_AGENT_PRIVATE_KEY funded
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Smoke tests

```bash
npm run smoke:credentials
npm run smoke:capability    # hard denials + cross-agent trace
npm run smoke:wallet        # dual addresses + execution tx
npm run smoke:reputation    # attest write + read-back (no PII)
npm run smoke:agent
npm run smoke:x402          # requires dev server
npm run smoke:partner       # pipeline + attestation; needs dev server
npm run smoke:swap
npm run smoke:delegation
```

## Integration map (for judges)

| Surface | Where |
|---------|--------|
| SD-JWT issue / present / verify | [`src/credentials/index.ts`](src/credentials/index.ts) |
| Proof-agent tools | [`src/agents/proof-agent/tools.ts`](src/agents/proof-agent/tools.ts) |
| Execution-agent tools | [`src/agents/execution-agent/tools.ts`](src/agents/execution-agent/tools.ts) |
| Orchestrator | [`src/orchestrator/index.ts`](src/orchestrator/index.ts) |
| Dual wallets | [`src/wallet/dual.ts`](src/wallet/dual.ts) |
| Reputation attestation | [`contracts/ReputationAttestation.sol`](contracts/ReputationAttestation.sol), [`src/reputation/index.ts`](src/reputation/index.ts) |
| Dynamic server wallet (WSL) | [`src/wallet/dynamic.ts`](src/wallet/dynamic.ts) |
| x402 compliance-check | [`src/app/api/compliance-check/route.ts`](src/app/api/compliance-check/route.ts), [`src/payments/x402.ts`](src/payments/x402.ts) |
| Uniswap SwapProvider | [`src/swap/uniswap.ts`](src/swap/uniswap.ts) (lines 1–120+), fallback [`src/swap/mock.ts`](src/swap/mock.ts) |
| Partner hand-off (no fiat) | [`src/partner/index.ts`](src/partner/index.ts) |

## Live vs simulated

See [`MOCKS.md`](MOCKS.md). Uniswap feedback: [`FEEDBACK.md`](FEEDBACK.md). Phase gates: [`PROGRESS.md`](PROGRESS.md).

## Thesis (pitch)

Dynamic gives an agent the right to act. Bankr is finance for people the system locked out. Proofport turns a private proof into portable onchain reputation — and stops at the regulated partner edge on purpose.
