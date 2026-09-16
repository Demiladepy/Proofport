/**
 * Bridge ETH: Ethereum Sepolia → Base Sepolia via L1StandardBridge.
 * Usage: npx tsx scripts/bridge-eth-to-base-sepolia.ts [amountEth]
 * Default amount: 0.01 ETH (leaves some for L1 gas).
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, baseSepolia } from "viem/chains";

const L1_STANDARD_BRIDGE =
  "0xfd0Bf71F60660E2f608ed56e1659C450eB113120" as const;

const bridgeAbi = parseAbi([
  "function bridgeETH(uint32 _minGasLimit, bytes _extraData) payable",
]);

async function main() {
  const pk = process.env.DEMO_AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("DEMO_AGENT_PRIVATE_KEY missing in .env");

  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`,
  );
  const amountArg = process.argv[2] ?? "0.01";
  const amount = parseEther(amountArg);

  const sepoliaRpc =
    process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
  const baseRpc = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(sepoliaRpc),
  });
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(sepoliaRpc),
  });
  const baseClient = createPublicClient({
    chain: baseSepolia,
    transport: http(baseRpc),
  });

  const bal = await publicClient.getBalance({ address: account.address });
  console.log(
    JSON.stringify(
      {
        address: account.address,
        ethereumSepoliaEth: formatEther(bal),
        bridgingAmountEth: amountArg,
      },
      null,
      2,
    ),
  );

  if (bal < amount + parseEther("0.002")) {
    throw new Error(
      `Not enough Ethereum Sepolia ETH. Have ${formatEther(bal)}, need ~${amountArg} + gas. Get Sepolia ETH first, then re-run.`,
    );
  }

  const hash = await walletClient.writeContract({
    address: L1_STANDARD_BRIDGE,
    abi: bridgeAbi,
    functionName: "bridgeETH",
    args: [200000, "0x"],
    value: amount,
  });

  console.log(
    JSON.stringify(
      {
        status: "submitted",
        l1TxHash: hash,
        etherscan: `https://sepolia.etherscan.io/tx/${hash}`,
        note: "Wait 1–3 minutes for Base Sepolia credit, then check balances.",
      },
      null,
      2,
    ),
  );

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(
    JSON.stringify(
      {
        l1Status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
      },
      null,
      2,
    ),
  );

  // poll Base a few times
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    const baseBal = await baseClient.getBalance({ address: account.address });
    console.log(
      JSON.stringify(
        {
          poll: i + 1,
          baseSepoliaEth: formatEther(baseBal),
          explorer: `https://sepolia.basescan.org/address/${account.address}`,
        },
        null,
        2,
      ),
    );
    if (baseBal > 0n) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            message: "Base Sepolia ETH arrived. Re-run: npx tsx tests/smoke/wallet.ts",
          },
          null,
          2,
        ),
      );
      return;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        message:
          "L1 bridge tx confirmed; Base credit can take a few more minutes. Check Superbridge activity or Basescan.",
        superbridge: "https://superbridge.app/base-sepolia",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
