import "dotenv/config";
import { createWalletClient, http, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const TO = (process.argv[2] ??
  "0xA83850aB6e3e15e038eE5f79318c40985aC7EA77") as Hex;

async function main() {
  const pk =
    process.env.EXECUTION_AGENT_PRIVATE_KEY ?? process.env.DEMO_AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("no execution key");
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex,
  );
  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
  });
  const hash = await wallet.sendTransaction({
    to: TO,
    value: parseEther("0.0003"),
  });
  console.log(JSON.stringify({ ok: true, funded: TO, txHash: hash }));
}

main().catch((err) => {
  console.log(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(1);
});
