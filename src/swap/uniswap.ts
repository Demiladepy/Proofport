/**
 * Uniswap V3 swap on Base Sepolia via QuoterV2 + SwapRouter02.
 * Falls back by throwing — caller uses MockSwap.
 *
 * SwapRouter02 ExactInputSingleParams has no deadline field.
 * Deadline is enforced with multicall(uint256 deadline, bytes[]).
 */
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
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
const FEE_TIERS = [3000, 500, 10000] as const;
const SLIPPAGE_BPS = 500n; // 5%
const DEADLINE_SECS = 1200;

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
  "function multicall(uint256 deadline, bytes[] data) payable returns (bytes[])",
]);

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
]);

function resolveToken(symbol: SwapRequest["fromToken"]): Address {
  if (symbol === "USDC") return BASE_SEPOLIA_UNISWAP.usdc;
  return BASE_SEPOLIA_UNISWAP.weth;
}

function amountInWei(req: SwapRequest): bigint {
  return req.fromToken === "USDC"
    ? parseUnits(req.amountIn, 6)
    : parseUnits(req.amountIn, 18);
}

function minOut(quoted: bigint): bigint {
  return (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;
}

function createBasePublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
}

async function quoteFee(
  publicClient: ReturnType<typeof createBasePublicClient>,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  fee: number,
): Promise<bigint> {
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
  return result[0] as bigint;
}

export async function quoteUniswapV3(
  req: SwapRequest,
): Promise<{ amountOut: string; fee: number }> {
  const publicClient = createBasePublicClient();
  const tokenIn = resolveToken(req.fromToken);
  const tokenOut = resolveToken(req.toToken);
  const amountIn = amountInWei(req);
  const errors: string[] = [];
  for (const fee of FEE_TIERS) {
    try {
      const amountOut = await quoteFee(
        publicClient,
        tokenIn,
        tokenOut,
        amountIn,
        fee,
      );
      return { amountOut: amountOut.toString(), fee };
    } catch (err) {
      errors.push(
        `fee ${fee}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  throw new Error(`No Uniswap V3 quote (${errors.join("; ")})`);
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
    const publicClient = createBasePublicClient();
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC),
    });

    const tokenIn = resolveToken(req.fromToken);
    const tokenOut = resolveToken(req.toToken);
    const amountIn = amountInWei(req);
    const nativeIn = req.fromToken === "ETH";
    const value = nativeIn ? amountIn : 0n;

    const quoted = await quoteUniswapV3(req);
    const amountOut = BigInt(quoted.amountOut);
    const amountOutMinimum = minOut(amountOut);
    const fee = quoted.fee;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECS);

    if (!nativeIn) {
      const allowance = await publicClient.readContract({
        address: tokenIn,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account.address, BASE_SEPOLIA_UNISWAP.swapRouter02],
      });
      if (allowance < amountIn) {
        const approveHash = await walletClient.writeContract({
          address: tokenIn,
          abi: erc20Abi,
          functionName: "approve",
          args: [BASE_SEPOLIA_UNISWAP.swapRouter02, amountIn],
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveHash,
        });
        if (approveReceipt.status !== "success") {
          throw new Error(`Uniswap token approve reverted: ${approveHash}`);
        }
      }
    }

    const params = {
      tokenIn,
      tokenOut,
      fee,
      recipient: account.address,
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96: BigInt(0),
    };

    const inner = encodeFunctionData({
      abi: routerAbi,
      functionName: "exactInputSingle",
      args: [params],
    });

    try {
      await publicClient.simulateContract({
        address: BASE_SEPOLIA_UNISWAP.swapRouter02,
        abi: routerAbi,
        functionName: "multicall",
        args: [deadline, [inner]],
        account: account.address,
        value,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`SwapRouter02 simulate reverted: ${reason}`);
    }

    // Live SwapRouter02 fill: multicall(deadline) → exactInputSingle
    const txHash = await walletClient.writeContract({
      address: BASE_SEPOLIA_UNISWAP.swapRouter02,
      abi: routerAbi,
      functionName: "multicall",
      args: [deadline, [inner]],
      value,
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
