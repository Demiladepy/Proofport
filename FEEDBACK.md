# Uniswap Developer Feedback (Proofport)

## What we built

An agent-driven cash-out flow that converts testnet crypto → USDC on **Base Sepolia** via the Uniswap Trading API, with SwapRouter02 + QuoterV2 as a direct-contract fallback, behind a `SwapProvider` interface. Mock only if both live paths fail, and then labeled.

## Integration

- Trading API: [`src/swap/trading-api.ts`](src/swap/trading-api.ts) (headers, `/quote` + `/swap`, Permit2/UniswapX request shaping)
- Direct V3: [`src/swap/uniswap.ts`](src/swap/uniswap.ts)
- Auto-fallback: [`src/swap/index.ts`](src/swap/index.ts)
- Universal Router 2.0 (Base Sepolia): `0x492e6456d9528771018deb9e87ef7750ef184104`
- SwapRouter02: `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4`
- QuoterV2: `0xC5290058841028F1614F3A6F0F5816cAd0df5E27`

## Feedback for Uniswap

1. **Testnet liquidity is the blocker, not contract availability.** Quoter/Router addresses exist on Base Sepolia, but empty pools make “AI agent trades on Uniswap” demos fragile. A faucet + seeded WETH/USDC pool per hackathon chain would unlock reliable demos.
2. **Trading API on Base Sepolia** is the right backend path when an API key is present; we still keep SwapRouter02 because hackathon quotes 404 when a pool is thin.
3. **Docs clarity:** SwapRouter02 struct has no `deadline` (unlike older ISwapRouter examples still circulating) — worth a callout in Base Sepolia examples.
4. **Agent DX:** a minimal “exactInputSingle from server wallet” recipe with Base Sepolia addresses in one page would cut integration time a lot.

## Feedback form

Complete the official Uniswap Developer Feedback Form for the track and link the public repo + this file.
