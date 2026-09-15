# Submission notes (Phase 9)

## Before Sat Sep 19, 4:00 PM EDT

1. Add secrets to `.env` (never commit):
   - `OPENAI_API_KEY`
   - `DYNAMIC_ENVIRONMENT_ID`, `DYNAMIC_API_TOKEN`, `DYNAMIC_WALLET_PASSWORD`
   - Fund Dynamic / agent wallet on Base Sepolia (faucet)
   - Optional: `DEMO_AGENT_PRIVATE_KEY`, `X402_PAY_TO`, USDC for live x402 ExactEvmScheme
2. Re-run and paste into PROGRESS.md:
   - `npm run smoke:wallet` (check Phase 3)
   - With Dynamic dashboard: enable delegated access; point webhook to `/api/webhooks/dynamic-delegation`
3. Screen-record one take → save as `demos/proofport-one-take.mp4`
4. Push public GitHub repo; fill Runtime + Uniswap feedback forms
5. Confirm MOCKS.md matches what you demo live vs simulated

## Commands

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
