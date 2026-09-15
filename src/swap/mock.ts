import type { SwapProvider, SwapRequest, SwapResult } from "./types";

/** Fallback when Base Sepolia Uniswap liquidity is thin. Documented in MOCKS.md. */
export class MockSwapProvider implements SwapProvider {
  name = "mock" as const;

  async swap(req: SwapRequest): Promise<SwapResult> {
    const txHash = `mock_${Date.now().toString(16)}` as const;
    return {
      provider: "mock",
      txHash,
      amountOut: req.toToken === "USDC" ? req.amountIn : "0.01",
      note: "MockSwap — no on-chain settlement. See MOCKS.md.",
    };
  }
}
