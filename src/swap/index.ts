import { MockSwapProvider } from "./mock";
import { UniswapSwapProvider, BASE_SEPOLIA_UNISWAP } from "./uniswap";
import {
  BASE_SEPOLIA_UNIVERSAL_ROUTER,
  TradingApiSwapProvider,
  hasTradingApiKey,
} from "./trading-api";
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
  const tradingApi = hasTradingApiKey();
  const uniswapLive = process.env.UNISWAP_LIVE !== "false" && mode !== "mock";
  if (!uniswapLive) {
    return {
      swapProvider,
      swapLabel: "Internal fallback",
      swapRouter: BASE_SEPOLIA_UNISWAP.swapRouter02,
      uniswapLive: false,
      tradingApi,
    };
  }
  return {
    swapProvider,
    swapLabel: tradingApi
      ? "Uniswap on Base Sepolia"
      : "Uniswap V3 on Base Sepolia",
    swapRouter: BASE_SEPOLIA_UNISWAP.swapRouter02,
    uniswapLive: true,
    tradingApi,
  };
}

export async function getSwapProvider(): Promise<SwapProvider> {
  const mode = (process.env.SWAP_PROVIDER ?? "auto").toLowerCase();
  if (mode === "mock") return new MockSwapProvider();
  if (mode === "uniswap") return new UniswapSwapProvider();
  if (hasTradingApiKey() && (mode === "auto" || mode === "trading-api")) {
    return new TradingApiSwapProvider();
  }
  return new UniswapSwapProvider();
}

export async function executeSwap(req: SwapRequest): Promise<SwapResult> {
  assertValidSwapRequest(req);
  const mode = (process.env.SWAP_PROVIDER ?? "auto").toLowerCase();
  const liveFlag = process.env.UNISWAP_LIVE;
  if (mode === "mock" || liveFlag === "false") {
    return new MockSwapProvider().swap(req);
  }

  const errors: string[] = [];
  const tryTrading =
    hasTradingApiKey() && (mode === "auto" || mode === "trading-api");

  if (tryTrading) {
    try {
      return await new TradingApiSwapProvider().swap(req);
    } catch (err) {
      errors.push(`Trading API: ${errText(err)}`);
    }
  } else if (mode === "trading-api") {
    errors.push("Trading API: UNISWAP_API_KEY is not set");
  }

  try {
    const result = await new UniswapSwapProvider().swap(req);
    if (errors.length === 0) return result;
    return {
      ...result,
      note: `Uniswap V3 SwapRouter02 on Base Sepolia. Trading API skipped (${errors.join("; ")}).`,
    };
  } catch (err) {
    errors.push(`SwapRouter02: ${errText(err)}`);
    if (mode === "uniswap") throw err;
  }

  const mock = await new MockSwapProvider().swap(req);
  return {
    ...mock,
    note: `Uniswap quote failed, used internal fallback. (${errors.join("; ") || "no live path"}). See MOCKS.md.`,
  };
}

export type { SwapRequest, SwapResult, SwapProvider };
export { BASE_SEPOLIA_UNISWAP, BASE_SEPOLIA_UNIVERSAL_ROUTER };
