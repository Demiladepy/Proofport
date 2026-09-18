import "dotenv/config";
import { createPublicClient, http, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
const HASH = (process.argv[2] ??
  "0xa6c9a6ac09b3ac702d509b8ccd67441d848ca763d3dae6b62c92fc337a097e20") as Hex;

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
  const receipt = await publicClient.getTransactionReceipt({ hash: HASH });
  console.log(
    JSON.stringify(
      {
        hash: HASH,
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        to: receipt.to,
        explorer: `https://sepolia.basescan.org/tx/${HASH}`,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
