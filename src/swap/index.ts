import { MockSwapProvider } from "./mock";
import { UniswapSwapProvider, BASE_SEPOLIA_UNISWAP } from "./uniswap";
import { BASE_SEPOLIA_UNIVERSAL_ROUTER } from "./trading-api";
import type { SwapProvider, SwapRequest, SwapResult } from "./types";

const AMOUNT_RE = /^[0-9]+\.?[0-9]*$/;
const TOKENS = new Set(["ETH", "WETH", "USDC"]);

export function registerUniswapProvider(_provider: SwapProvider) {
  // reserved for tests
}

export function assertValidSwapRequest(req: SwapRequest): void {
  if (!TOKENS.has(req.fromToken) || !TOKENS.has(req.toToken)) {
    throw new Error("Unsupported swap token");
  }
  if (!AMOUNT_RE.test(req.amountIn) || req.amountIn.split(".").length > 2) {
    throw new Error("Invalid swap amount");
  }
  if (Number(req.amountIn) <= 0) {
    throw new Error("Swap amount must be positive");
  }
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function getSwapRailInfo(): {
  swapProvider: string;
  swapLabel: string;
  swapRouter: string;
  uniswapLive: boolean;
  tradingApi: boolean;
} {
  const swapProvider = process.env.SWAP_PROVIDER ?? "auto";
  const mode = swapProvider.toLowerCase();
  const uniswapLive =
    process.env.UNISWAP_LIVE === "true" && mode !== "mock";
  return {
    swapProvider,
    swapLabel: uniswapLive
      ? "Uniswap V3 on Base Sepolia"
      : "Internal fallback",
    swapRouter: BASE_SEPOLIA_UNISWAP.swapRouter02,
    uniswapLive,
    tradingApi: false,
  };
}

export async function getSwapProvider(): Promise<SwapProvider> {
  const mode = (process.env.SWAP_PROVIDER ?? "auto").toLowerCase();
  if (mode === "mock" || process.env.UNISWAP_LIVE !== "true") {
    return new MockSwapProvider();
  }
  return new UniswapSwapProvider();
}

export async function executeSwap(req: SwapRequest): Promise<SwapResult> {
  assertValidSwapRequest(req);
  const mode = (process.env.SWAP_PROVIDER ?? "auto").toLowerCase();
  if (mode === "mock" || process.env.UNISWAP_LIVE !== "true") {
    return new MockSwapProvider().swap(req);
  }

  try {
    return await new UniswapSwapProvider().swap(req);
  } catch (err) {
    if (mode === "uniswap") throw err;
    const mock = await new MockSwapProvider().swap(req);
    return {
      ...mock,
      note: `Uniswap quote failed, used internal fallback. (${errText(err)}). See MOCKS.md.`,
    };
  }
}

export type { SwapRequest, SwapResult, SwapProvider };
export { BASE_SEPOLIA_UNISWAP, BASE_SEPOLIA_UNIVERSAL_ROUTER };
