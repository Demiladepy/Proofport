import "dotenv/config";
import { quoteUniswapV3 } from "../src/swap/uniswap";
import {
  hasTradingApiKey,
  probeTradingApiQuote,
} from "../src/swap/trading-api";
import { UniswapSwapProvider } from "../src/swap/uniswap";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const execute = process.argv.includes("--execute");
  const req = { amountIn: "0.0001", fromToken: "ETH" as const, toToken: "USDC" as const };
  const out: Record<string, unknown> = { execute };

  if (hasTradingApiKey()) {
    try {
      const pk =
        process.env.EXECUTION_AGENT_PRIVATE_KEY ??
        process.env.DEMO_AGENT_PRIVATE_KEY;
      if (!pk) throw new Error("no execution key");
      const account = privateKeyToAccount(
        (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`,
      );
      out.tradingApiQuote = {
        ok: true,
        ...(await probeTradingApiQuote(req, account.address)),
      };
    } catch (err) {
      out.tradingApiQuote = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    out.tradingApiQuote = { ok: false, error: "UNISWAP_API_KEY not set" };
  }

  try {
    out.swapRouter02Quote = {
      ok: true,
      ...(await quoteUniswapV3(req)),
    };
  } catch (err) {
    out.swapRouter02Quote = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!execute) {
    console.log(JSON.stringify({ ...out, note: "quote-only; pass --execute to broadcast" }, null, 2));
    return;
  }

  const provider = new UniswapSwapProvider();
  try {
    const result = await provider.swap(req);
    console.log(JSON.stringify({ ...out, ok: true, live: true, result }, null, 2));
  } catch (err) {
    console.log(
      JSON.stringify(
        {
          ...out,
          ok: false,
          live: false,
          error: err instanceof Error ? err.message : String(err),
        },
        null,
        2,
      ),
    );
    process.exitCode = 0;
  }
}

main();
