import "dotenv/config";
import { createPublicClient, http, formatEther, formatUnits, parseAbi } from "viem";
import { sepolia, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const pk = process.env.DEMO_AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("DEMO_AGENT_PRIVATE_KEY missing");
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`,
  );
  const addr = account.address;

  const ethL1 = createPublicClient({
    chain: sepolia,
    transport: http(
      process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    ),
  });
  const base = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
  });

  const usdcAbi = parseAbi([
    "function balanceOf(address) view returns (uint256)",
  ]);
  const usdcBase = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
  // Circle USDC on Ethereum Sepolia
  const usdcSepolia = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;

  const [ethS, ethB, usdcB, usdcS] = await Promise.all([
    ethL1.getBalance({ address: addr }),
    base.getBalance({ address: addr }),
    base.readContract({
      address: usdcBase,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [addr],
    }),
    ethL1
      .readContract({
        address: usdcSepolia,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [addr],
      })
      .catch(() => 0n),
  ]);

  console.log(
    JSON.stringify(
      {
        address: addr,
        ethereumSepolia: {
          eth: formatEther(ethS),
          circleUsdc: formatUnits(usdcS, 6),
        },
        baseSepolia: {
          eth: formatEther(ethB),
          circleUsdc: formatUnits(usdcB, 6),
        },
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
