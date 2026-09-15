# Proofport

AI agent that carries verifiable identity + fund-provenance credentials (SD-JWT selective disclosure), pays its own compliance fee via x402, swaps to USDC, and hands off to a **mock licensed partner** — **no fiat moves in this app**.

Built for Runtime (Bankr × Propaganda) · Dynamic + Uniswap tracks.

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Smoke tests

```bash
npm run smoke:credentials
npm run smoke:agent
npm run smoke:x402          # requires dev server
npm run smoke:partner       # requires dev server for x402 step
npm run smoke:swap
npm run smoke:delegation
npm run smoke:wallet        # needs DYNAMIC_* or DEMO_AGENT_PRIVATE_KEY
```

## Integration map (for judges)

| Surface | Where |
|---------|--------|
| SD-JWT issue / present / verify | [`src/credentials/index.ts`](src/credentials/index.ts) |
| Agent tools + plan | [`src/agent/tools.ts`](src/agent/tools.ts), [`src/agent/index.ts`](src/agent/index.ts) |
| Dynamic server wallet | [`src/wallet/dynamic.ts`](src/wallet/dynamic.ts) |
| Dynamic delegated-access webhook | [`src/app/api/webhooks/dynamic-delegation/route.ts`](src/app/api/webhooks/dynamic-delegation/route.ts) |
| x402 compliance-check | [`src/app/api/compliance-check/route.ts`](src/app/api/compliance-check/route.ts), [`src/payments/x402.ts`](src/payments/x402.ts) |
| Uniswap SwapProvider | [`src/swap/uniswap.ts`](src/swap/uniswap.ts) (lines 1–120+), fallback [`src/swap/mock.ts`](src/swap/mock.ts) |
| Partner hand-off (no fiat) | [`src/partner/index.ts`](src/partner/index.ts) |

## Live vs simulated

See [`MOCKS.md`](MOCKS.md). Uniswap feedback: [`FEEDBACK.md`](FEEDBACK.md). Phase gates: [`PROGRESS.md`](PROGRESS.md).

## Thesis (pitch)

Dynamic gives an agent the right to act. Bankr is finance for people the system locked out. We stress-tested that against the hardest real user — proving identity + provenance privately, once — and stop at the regulated partner edge on purpose.
