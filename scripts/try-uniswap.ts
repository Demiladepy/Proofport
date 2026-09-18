import "dotenv/config";
import { quoteUniswapV3, UniswapSwapProvider } from "../src/swap/uniswap";

async function main() {
  const execute = process.argv.includes("--execute");
  const req = {
    amountIn: "0.0001",
    fromToken: "ETH" as const,
    toToken: "USDC" as const,
  };
  const out: Record<string, unknown> = { execute };

  try {
    out.swapRouter02Quote = { ok: true, ...(await quoteUniswapV3(req)) };
  } catch (err) {
    out.swapRouter02Quote = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!execute) {
    console.log(
      JSON.stringify(
        { ...out, note: "quote-only; pass --execute to broadcast" },
        null,
        2,
      ),
    );
    return;
  }

  const provider = new UniswapSwapProvider();
  const result = await provider.swap(req);
  console.log(JSON.stringify({ ...out, ok: true, live: true, result }, null, 2));
}

main().catch((err) => {
  console.log(
    JSON.stringify(
      {
        ok: false,
        live: false,
        error: err instanceof Error ? err.message : String(err),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
