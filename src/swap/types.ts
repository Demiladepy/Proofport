import type { Address, Hex } from "viem";

export type SwapRequest = {
  fromToken: "ETH" | "WETH" | "USDC";
  toToken: "ETH" | "WETH" | "USDC";
  amountIn: string;
};

export type SwapResult = {
  provider: "uniswap" | "mock";
  txHash: Hex | `mock_${string}`;
  amountOut: string;
  explorerUrl?: string;
  note?: string;
};

export interface SwapProvider {
  name: "uniswap" | "mock";
  swap(req: SwapRequest): Promise<SwapResult>;
}

export type WalletBalances = {
  address?: Address;
  eth?: string;
  usdc?: string;
};
