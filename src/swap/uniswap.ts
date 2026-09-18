/**
 * Uniswap V3 swap on Base Sepolia via QuoterV2 + SwapRouter02.
 * Falls back by throwing — caller uses MockSwap.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import type { SwapProvider, SwapRequest, SwapResult } from "./types";

const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

/** Uniswap V3 on Base Sepolia (official deployments) */
export const BASE_SEPOLIA_UNISWAP = {
  swapRouter02: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4" as Address,
  quoterV2: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27" as Address,
  factory: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24" as Address,
  weth: "0x4200000000000000000000000000000000000006" as Address,
  usdc: (process.env.USDC_ADDRESS ??
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address,
};

const quoterAbi = parseAbi([
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160, uint32, uint256)",
]);

const routerAbi = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
]);

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);

function resolveToken(symbol: SwapRequest["fromToken"]): Address {
  if (symbol === "USDC") return BASE_SEPOLIA_UNISWAP.usdc;
  return BASE_SEPOLIA_UNISWAP.weth;
}

export async function quoteUniswapV3(req: SwapRequest): Promise<{ amountOut: string }> {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
  const tokenIn = resolveToken(req.fromToken);
  const tokenOut = resolveToken(req.toToken);
  const amountIn =
    req.fromToken === "USDC"
      ? parseUnits(req.amountIn, 6)
      : parseUnits(req.amountIn, 18);
  const { result } = await publicClient.simulateContract({
    address: BASE_SEPOLIA_UNISWAP.quoterV2,
    abi: quoterAbi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn,
        tokenOut,
        amountIn,
        fee: 3000,
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
  });
  return { amountOut: (result[0] as bigint).toString() };
}

export class UniswapSwapProvider implements SwapProvider {
  name = "uniswap" as const;

  async swap(req: SwapRequest): Promise<SwapResult> {
    const pk =
      process.env.EXECUTION_AGENT_PRIVATE_KEY ??
      process.env.DEMO_AGENT_PRIVATE_KEY ??
      process.env.FAUCET_PRIVATE_KEY;
    if (!pk) {
      throw new Error("No private key for Uniswap swap signer");
    }
    const account = privateKeyToAccount(
      (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex,
    );
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC),
    });
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC),
    });

    const tokenIn = resolveToken(req.fromToken);
    const tokenOut = resolveToken(req.toToken);
    const fee = 3000;
    const amountIn =
      req.fromToken === "USDC"
        ? parseUnits(req.amountIn, 6)
        : parseUnits(req.amountIn, 18);

    // Probe pool / quote — throws if no liquidity
    const { result } = await publicClient.simulateContract({
      address: BASE_SEPOLIA_UNISWAP.quoterV2,
      abi: quoterAbi,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn,
          tokenOut,
          amountIn,
          fee,
          sqrtPriceLimitX96: BigInt(0),
        },
      ],
    });
    const amountOut = result[0] as bigint;

    if (tokenIn !== BASE_SEPOLIA_UNISWAP.weth || req.fromToken !== "ETH") {
      await walletClient.writeContract({
        address: tokenIn,
        abi: erc20Abi,
        functionName: "approve",
        args: [BASE_SEPOLIA_UNISWAP.swapRouter02, amountIn],
      });
    }

    const txHash = await walletClient.writeContract({
      address: BASE_SEPOLIA_UNISWAP.swapRouter02,
      abi: routerAbi,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn,
          tokenOut,
          fee,
          recipient: account.address,
          amountIn,
          amountOutMinimum: (amountOut * BigInt(95)) / BigInt(100),
          sqrtPriceLimitX96: BigInt(0),
        },
      ],
      value:
        req.fromToken === "ETH" || req.fromToken === "WETH" ? amountIn : BigInt(0),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new Error(`Uniswap swap reverted: ${txHash}`);
    }

    return {
      provider: "uniswap",
      via: "swaprouter02",
      txHash,
      amountOut: amountOut.toString(),
      explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
      note: "Uniswap V3 SwapRouter02 on Base Sepolia",
    };
  }
}
