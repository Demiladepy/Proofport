import "dotenv/config";
import { UniswapSwapProvider } from "../src/swap/uniswap";

async function main() {
  const provider = new UniswapSwapProvider();
  try {
    const result = await provider.swap({
      amountIn: "0.0001",
      fromToken: "ETH",
      toToken: "USDC",
    });
    console.log(JSON.stringify({ ok: true, live: true, result }, null, 2));
  } catch (err) {
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
    process.exitCode = 0;
  }
}

main();
