# Uniswap Developer Feedback (Proofport)

## What we built

An agent-driven cash-out **rail** that converts a tiny amount of testnet ETH → USDC on **Base Sepolia** via Uniswap V3 **SwapRouter02** (`exactInputSingle` wrapped in `multicall` for deadline), behind a `SwapProvider` interface. The Trading API is unused. Mock only if the on-chain quote or swap throws, and then labeled.

Confirmed live fill (receipt `status=success`, USDC transferred to the execution wallet from the pool):

- Tx: [`0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3`](https://sepolia.basescan.org/tx/0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3)
- From execution wallet `0x0afC983C15444DFDaaD76aBF22f1D1053035AE67` to SwapRouter02 `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4`
- Pool `0x46880b404CD35c165EDdefF7421019F8dD25F4Ad` sent `0.395801` USDC to the wallet; router sent `0.0001` WETH to the pool
- Re-checked on RPC: receipt success, `to` = SwapRouter02

Supporting earlier SwapRouter02 fills (same sender, same router):

- [`0xa6c9a6ac09b3ac702d509b8ccd67441d848ca763d3dae6b62c92fc337a097e20`](https://sepolia.basescan.org/tx/0xa6c9a6ac09b3ac702d509b8ccd67441d848ca763d3dae6b62c92fc337a097e20)
- [`0x8691645781a0ca62d2f93a07d792e73bb1d0764f10c2dfa7ffc66127439448c5`](https://sepolia.basescan.org/tx/0x8691645781a0ca62d2f93a07d792e73bb1d0764f10c2dfa7ffc66127439448c5)

## Integration

- Live AMM: [`src/swap/uniswap.ts`](src/swap/uniswap.ts) `UniswapSwapProvider`
  - QuoterV2 `quoteExactInputSingle` L74–88
  - `exactInputSingle` calldata L190–194
  - `multicall(deadline)` broadcast L211–217
- Auto + labeled mock fallback: [`src/swap/index.ts`](src/swap/index.ts) L59–75 (`tradingApi: false`)
- SwapRouter02: `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4`
- QuoterV2: `0xC5290058841028F1614F3A6F0F5816cAd0df5E27`

## Feedback for Uniswap

1. **Testnet liquidity is the blocker, not contract availability.** Quoter/Router addresses exist on Base Sepolia, but empty pools make “AI agent trades on Uniswap” demos fragile. A faucet + seeded WETH/USDC pool per hackathon chain would unlock reliable demos.
2. **Trading API on Base Sepolia** 404s for this ETH/USDC pair even with a valid key. Direct SwapRouter02 + QuoterV2 is the path that actually fills. We left Trading API unused.
3. **Docs clarity:** SwapRouter02 `exactInputSingle` struct has no `deadline` (unlike older ISwapRouter examples still circulating). Deadline belongs on `multicall(uint256 deadline, bytes[])`.
4. **Agent DX:** a minimal “exactInputSingle from server wallet” recipe with Base Sepolia addresses in one page would cut integration time a lot.

## Feedback form

Paste the Uniswap Developer Feedback Form answers from [`SUBMISSION.md`](SUBMISSION.md). Recording and the official form POST stay **manual**.
