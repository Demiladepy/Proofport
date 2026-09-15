import "dotenv/config";
import { executeSwap } from "../../src/swap";

async function main() {
  if (!process.env.SWAP_PROVIDER || process.env.SWAP_PROVIDER === "auto") {
    process.env.SWAP_PROVIDER = "mock";
  }
  const result = await executeSwap({
    amountIn: "0.01",
    fromToken: "ETH",
    toToken: "USDC",
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.txHash) {
    process.exitCode = 1;
    throw new Error("swap failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
