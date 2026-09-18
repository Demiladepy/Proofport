import "dotenv/config";
import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { BASE_SEPOLIA_UNISWAP } from "../src/swap/uniswap";

const HASH = (process.argv[2] ??
  "0xd4ddc55d5a6db1efe065fb6151712da244eb3a3aaa5908558b6a50e8721346d3") as Hex;

const transferAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

async function main() {
  const pk =
    process.env.EXECUTION_AGENT_PRIVATE_KEY ?? process.env.DEMO_AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("no execution key");
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex,
  );
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
  });
  const receipt = await client.getTransactionReceipt({ hash: HASH });
  const tx = await client.getTransaction({ hash: HASH });

  const transfers: Array<{
    token: string;
    from: string;
    to: string;
    amount: string;
  }> = [];
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: transferAbi,
        data: log.data,
        topics: log.topics,
      });
      const token =
        log.address.toLowerCase() === BASE_SEPOLIA_UNISWAP.usdc.toLowerCase()
          ? "USDC"
          : log.address.toLowerCase() === BASE_SEPOLIA_UNISWAP.weth.toLowerCase()
            ? "WETH"
            : log.address;
      const decimals = token === "USDC" ? 6 : 18;
      transfers.push({
        token,
        from: decoded.args.from,
        to: decoded.args.to,
        amount: formatUnits(decoded.args.value, decimals),
      });
    } catch {
      /* not a Transfer */
    }
  }

  const usdcToWallet = transfers.filter(
    (t) =>
      t.token === "USDC" &&
      t.to.toLowerCase() === account.address.toLowerCase(),
  );
  const wethFromRouterOrWallet = transfers.filter((t) => t.token === "WETH");

  console.log(
    JSON.stringify(
      {
        hash: HASH,
        explorer: `https://sepolia.basescan.org/tx/${HASH}`,
        status: receipt.status,
        from: tx.from,
        to: tx.to,
        expectedFrom: account.address,
        expectedTo: BASE_SEPOLIA_UNISWAP.swapRouter02,
        valueWei: tx.value.toString(),
        gasUsed: receipt.gasUsed.toString(),
        transfers,
        usdcReceivedByExecutionWallet: usdcToWallet,
        wethTransfers: wethFromRouterOrWallet,
        fromMatches: tx.from.toLowerCase() === account.address.toLowerCase(),
        toIsSwapRouter02:
          (tx.to ?? "").toLowerCase() ===
          BASE_SEPOLIA_UNISWAP.swapRouter02.toLowerCase(),
        liveFill:
          receipt.status === "success" &&
          usdcToWallet.length > 0 &&
          tx.from.toLowerCase() === account.address.toLowerCase(),
      },
      null,
      2,
    ),
  );
  if (receipt.status !== "success" || usdcToWallet.length === 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
