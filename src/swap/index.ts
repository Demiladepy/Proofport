import { MockSwapProvider } from "./mock";
import { UniswapSwapProvider, BASE_SEPOLIA_UNISWAP } from "./uniswap";
import type { SwapProvider, SwapRequest, SwapResult } from "./types";

export function registerUniswapProvider(_provider: SwapProvider) {
  // reserved for tests
}

export async function getSwapProvider(): Promise<SwapProvider> {
  const mode = (process.env.SWAP_PROVIDER ?? "auto").toLowerCase();
  if (mode === "mock") return new MockSwapProvider();
  if (mode === "uniswap") return new UniswapSwapProvider();
  return new UniswapSwapProvider();
}

export async function executeSwap(req: SwapRequest): Promise<SwapResult> {
  const mode = (process.env.SWAP_PROVIDER ?? "auto").toLowerCase();
  if (mode === "mock") {
    return new MockSwapProvider().swap(req);
  }

  const uniswap = new UniswapSwapProvider();
  try {
    return await uniswap.swap(req);
  } catch (err) {
    if (mode === "uniswap") throw err;
    const mock = new MockSwapProvider();
    const result = await mock.swap(req);
    return {
      ...result,
      note: `Uniswap unavailable (${err instanceof Error ? err.message : String(err)}); MockSwap used. See MOCKS.md.`,
    };
  }
}

export type { SwapRequest, SwapResult, SwapProvider };
export { BASE_SEPOLIA_UNISWAP };
