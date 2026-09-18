/**
 * Uniswap Trading API on Base Sepolia.
 * Server-side only. Falls back by throwing — caller uses SwapRouter02 / mock.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  isHex,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { getExecutionPrivateKey } from "@/wallet/dual";
import type { SwapProvider, SwapRequest, SwapResult } from "./types";

export const TRADING_API_URL = "https://trade-api.gateway.uniswap.org/v1";
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const NATIVE_ETH = "0x0000000000000000000000000000000000000000" as Address;
/** Universal Router 2.0 on Base Sepolia */
export const BASE_SEPOLIA_UNIVERSAL_ROUTER =
  "0x492e6456d9528771018deb9e87ef7750ef184104" as Address;

const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

const AGENT_INFO = JSON.stringify({
  integration_name: "swap-integration",
  decision_origin: "autonomous",
  version: "1.5.0",
});

export function hasTradingApiKey(): boolean {
  return Boolean(process.env.UNISWAP_API_KEY?.trim());
}

export function tradingApiHeaders(): Record<string, string> {
  const key = process.env.UNISWAP_API_KEY?.trim();
  if (!key) throw new Error("UNISWAP_API_KEY is not set");
  return {
    "Content-Type": "application/json",
    "x-api-key": key,
    "x-universal-router-version": "2.0",
    "x-agent-info": AGENT_INFO,
  };
}

type DutchOrderOutput = {
  token: string;
  startAmount: string;
  endAmount: string;
  recipient: string;
};

type ClassicQuoteResponse = {
  routing: "CLASSIC" | "WRAP" | "UNWRAP";
  quote: {
    input: { token: string; amount: string };
    output: { token: string; amount: string };
    slippage?: number;
    route?: unknown[];
    gasFee?: string;
    gasFeeUSD?: string;
    gasUseEstimate?: string;
  };
  permitData: Record<string, unknown> | null;
};

type UniswapXQuoteResponse = {
  routing: "DUTCH_V2" | "DUTCH_V3" | "PRIORITY";
  quote: {
    orderInfo: {
      outputs: DutchOrderOutput[];
      input: { token: string; startAmount: string; endAmount: string };
      deadline: number;
      nonce: string;
    };
    encodedOrder: string;
    orderHash: string;
  };
  permitData: Record<string, unknown> | null;
};

export type QuoteResponse = ClassicQuoteResponse | UniswapXQuoteResponse;

export function isUniswapXQuote(q: QuoteResponse): q is UniswapXQuoteResponse {
  return q.routing === "DUTCH_V2" || q.routing === "DUTCH_V3" || q.routing === "PRIORITY";
}

export function getOutputAmount(q: QuoteResponse): string {
  if (isUniswapXQuote(q)) {
    const firstOutput = q.quote.orderInfo.outputs[0];
    if (!firstOutput) throw new Error("UniswapX quote has no outputs");
    return firstOutput.startAmount;
  }
  return q.quote.output.amount;
}

export function prepareSwapRequest(
  quoteResponse: Record<string, unknown>,
  signature?: string,
): Record<string, unknown> {
  const { permitData, permitTransaction: _permitTransaction, ...cleanQuote } =
    quoteResponse;
  const request: Record<string, unknown> = { ...cleanQuote };
  const routing = quoteResponse.routing;
  const isUniswapX =
    routing === "DUTCH_V2" || routing === "DUTCH_V3" || routing === "PRIORITY";

  if (isUniswapX) {
    if (signature) request.signature = signature;
  } else if (signature && permitData && typeof permitData === "object") {
    request.signature = signature;
    request.permitData = permitData;
  }
  return request;
}

export function validateSwapBeforeBroadcast(swap: {
  data?: string;
  to?: string;
  from?: string;
  value?: string;
}): void {
  if (!swap?.data || swap.data === "" || swap.data === "0x") {
    throw new Error("swap.data is empty - quote may have expired");
  }
  if (!isHex(swap.data)) {
    throw new Error("swap.data is not valid hex");
  }
  if (!swap.to || !isAddress(swap.to)) {
    throw new Error("swap.to is not a valid address");
  }
  if (!swap.from || !isAddress(swap.from)) {
    throw new Error("swap.from is not a valid address");
  }
  if (swap.value === undefined || swap.value === null) {
    throw new Error("swap.value is missing");
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 5,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, init);
    if (response.status !== 429 && response.status < 500) return response;
    if (attempt === maxRetries) {
      lastError = new Error(
        `Trading API failed after ${maxRetries} retries: ${response.status}`,
      );
      break;
    }
    const delay = Math.min(200 * 2 ** attempt + Math.random() * 100, 10_000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw lastError ?? new Error("Trading API request failed");
}

async function tradingApiJson(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const response = await fetchWithRetry(`${TRADING_API_URL}${path}`, {
    method: "POST",
    headers: tradingApiHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data };
}

function tokenAddress(symbol: SwapRequest["fromToken"]): Address {
  if (symbol === "ETH") return NATIVE_ETH;
  if (symbol === "USDC") {
    return (process.env.USDC_ADDRESS ??
      "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address;
  }
  return "0x4200000000000000000000000000000000000006" as Address;
}

function amountBaseUnits(req: SwapRequest): string {
  const decimals = req.fromToken === "USDC" ? 6 : 18;
  return parseUnits(req.amountIn, decimals).toString();
}

function apiError(data: Record<string, unknown>, fallback: string): string {
  const detail = data.detail ?? data.error ?? data.message ?? data.errorCode;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return fallback;
}

export type TradingApiQuoteProbe = {
  routing: string;
  amountOut: string;
  gasFeeUSD?: string;
};

async function requestQuote(body: Record<string, unknown>) {
  return tradingApiJson("/quote", body);
}

async function fetchClassicQuote(params: {
  swapper: Address;
  tokenIn: Address;
  tokenOut: Address;
  amount: string;
}): Promise<Record<string, unknown>> {
  const base = {
    swapper: params.swapper,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    tokenInChainId: String(BASE_SEPOLIA_CHAIN_ID),
    tokenOutChainId: String(BASE_SEPOLIA_CHAIN_ID),
    amount: params.amount,
    type: "EXACT_INPUT",
    slippageTolerance: 0.5,
  };
  const attempts: Array<Record<string, unknown>> = [
    { ...base, routingPreference: "FASTEST" },
    { ...base, routingPreference: "BEST_PRICE" },
  ];
  let lastError = "Quote failed";
  for (const attempt of attempts) {
    const quoteRes = await requestQuote(attempt);
    if (quoteRes.ok && quoteRes.data.routing) {
      return quoteRes.data;
    }
    lastError = apiError(quoteRes.data, `Quote failed (${quoteRes.status})`);
    if (!/timed out|retry/i.test(lastError)) break;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error(lastError);
}

export async function probeTradingApiQuote(
  req: SwapRequest,
  swapper: Address,
): Promise<TradingApiQuoteProbe> {
  const quoteResponse = await fetchClassicQuote({
    swapper,
    tokenIn: tokenAddress(req.fromToken),
    tokenOut: tokenAddress(req.toToken),
    amount: amountBaseUnits(req),
  });
  const quote = quoteResponse as unknown as QuoteResponse;
  const amountOut = getOutputAmount(quote);
  const gasFeeUSD =
    !isUniswapXQuote(quote) && typeof quote.quote.gasFeeUSD === "string"
      ? quote.quote.gasFeeUSD
      : undefined;
  return { routing: quote.routing, amountOut, gasFeeUSD };
}

export class TradingApiSwapProvider implements SwapProvider {
  name = "uniswap" as const;

  async swap(req: SwapRequest): Promise<SwapResult> {
    const account = privateKeyToAccount(getExecutionPrivateKey());
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC),
    });
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC),
    });

    const tokenIn = tokenAddress(req.fromToken);
    const amount = amountBaseUnits(req);

    if (tokenIn !== NATIVE_ETH) {
      const approvalRes = await tradingApiJson("/check_approval", {
        walletAddress: account.address,
        token: tokenIn,
        amount,
        chainId: BASE_SEPOLIA_CHAIN_ID,
      });
      if (!approvalRes.ok) {
        throw new Error(
          apiError(approvalRes.data, `Approval check failed (${approvalRes.status})`),
        );
      }
      const approval = approvalRes.data.approval as
        | { to: Address; data: Hex; value?: string }
        | null
        | undefined;
      if (approval?.to && approval.data) {
        const hash = await walletClient.sendTransaction({
          to: approval.to,
          data: approval.data,
          value: BigInt(approval.value || "0"),
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
    }

    const quoteResponse = await fetchClassicQuote({
      swapper: account.address,
      tokenIn,
      tokenOut: tokenAddress(req.toToken),
      amount,
    });
    const quote = quoteResponse as unknown as QuoteResponse;
    const amountOut = getOutputAmount(quote);
    const swapRequest = prepareSwapRequest(quoteResponse);

    const swapRes = await tradingApiJson("/swap", swapRequest);
    if (!swapRes.ok) {
      throw new Error(apiError(swapRes.data, `Swap request failed (${swapRes.status})`));
    }

    const swap = swapRes.data.swap as {
      to: Address;
      from: Address;
      data: Hex;
      value: string;
      gasLimit?: string;
    };
    validateSwapBeforeBroadcast(swap);
    if (swap.from.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error("Trading API swap.from does not match execution wallet");
    }

    const txHash = await walletClient.sendTransaction({
      to: swap.to,
      data: swap.data,
      value: BigInt(swap.value || "0"),
      ...(swap.gasLimit
        ? { gas: (BigInt(swap.gasLimit) * 115n) / 100n }
        : {}),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new Error(`Uniswap Trading API swap reverted: ${txHash}`);
    }

    return {
      provider: "uniswap",
      via: "trading-api",
      txHash,
      amountOut,
      explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
      note: "Uniswap Trading API on Base Sepolia",
    };
  }
}
