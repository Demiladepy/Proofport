# Uniswap Developer Feedback (Proofport)

## What we built

An agent-driven cash-out flow that converts testnet crypto → USDC on **Base Sepolia** via Uniswap V3 (`SwapRouter02` + `QuoterV2`), behind a `SwapProvider` interface with a mock fallback when liquidity is thin.

## Integration

- Primary: [`src/swap/uniswap.ts`](src/swap/uniswap.ts)
- Interface + auto-fallback: [`src/swap/index.ts`](src/swap/index.ts)
- Router: `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4`
- QuoterV2: `0xC5290058841028F1614F3A6F0F5816cAd0df5E27`

## Feedback for Uniswap

1. **Testnet liquidity is the blocker, not contract availability.** Quoter/Router addresses exist on Base Sepolia, but empty pools make “AI agent trades on Uniswap” demos fragile. A faucet + seeded WETH/USDC pool per hackathon chain would unlock reliable demos.
2. **Trading API / SOR on testnets** is unreliable for hackathon timelines; we used direct QuoterV2 + SwapRouter02 via viem.
3. **Docs clarity:** SwapRouter02 struct has no `deadline` (unlike older ISwapRouter examples still circulating) — worth a callout in Base Sepolia examples.
4. **Agent DX:** a minimal “exactInputSingle from server wallet” recipe with Base Sepolia addresses in one page would cut integration time a lot.

## Feedback form

Complete the official Uniswap Developer Feedback Form for the track and link the public repo + this file.
