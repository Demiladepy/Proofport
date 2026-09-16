import "dotenv/config";
import {
  hasDynamicEnv,
  sendTinyTestTx,
  ensureDynamicWallet,
  ensureLocalViemWallet,
} from "../../src/wallet/dynamic";
import { grantDelegation } from "../../src/delegation";
import { createPublicClient, http, formatEther, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";

const USDC = (process.env.USDC_ADDRESS ??
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`;
const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

async function balances(address: `0x${string}`) {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
  const eth = await client.getBalance({ address });
  let usdc = "n/a";
  try {
    const raw = await client.readContract({
      address: USDC,
      abi: [
        {
          type: "function",
          name: "balanceOf",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ type: "uint256" }],
        },
      ] as const,
      functionName: "balanceOf",
      args: [address],
    });
    usdc = formatUnits(raw, 6);
  } catch {
    /* ignore */
  }
  return { eth: formatEther(eth), usdc };
}

async function main() {
  grantDelegation({ mode: "app_level_fallback", note: "smoke:wallet grant" });

  const report: Record<string, unknown> = {
    hasDynamicEnv: hasDynamicEnv(),
    platform: process.platform,
  };

  try {
    // Prefer local key on Windows so we always get a fundable address
    let wallet;
    if (process.platform === "win32" && process.env.DEMO_AGENT_PRIVATE_KEY) {
      wallet = await ensureLocalViemWallet();
      report.walletMode = "local_viem_windows_fallback";
      report.note =
        "Dynamic Node MPC (Neon) does not support win32. Using DEMO_AGENT_PRIVATE_KEY. For real Dynamic server wallet, run smoke under WSL/Linux.";
    } else if (hasDynamicEnv()) {
      try {
        wallet = await ensureDynamicWallet();
        report.walletMode = "dynamic";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report.dynamicError = msg;
        wallet = await ensureLocalViemWallet();
        report.walletMode = "local_viem_fallback";
      }
    } else {
      wallet = await ensureLocalViemWallet();
      report.walletMode = "local_viem";
    }

    report.wallet = wallet;
    report.agentAddress = wallet.address;
    report.x402PayTo =
      process.env.X402_PAY_TO ||
      "(set X402_PAY_TO in .env — can be the same as agentAddress for demo)";
    report.fundThisAddress = wallet.address;
    report.fundWith = {
      eth: "Base Sepolia ETH (gas) — use a testnet faucet, NOT OKX mainnet withdraw",
      usdc: "Circle faucet Base Sepolia USDC → same agent address",
      explorer: wallet.address
        ? `https://sepolia.basescan.org/address/${wallet.address}`
        : undefined,
    };

    if (wallet.address) {
      report.balances = await balances(wallet.address);
    }

    const ethBal = Number((report.balances as { eth?: string })?.eth ?? 0);
    if (ethBal < 0.00001) {
      report.ok = true;
      report.tx = null;
      report.nextStep =
        "Address ready. Fund agentAddress with Base Sepolia ETH (+ Circle USDC), then re-run this smoke to broadcast a tx.";
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const tx = await sendTinyTestTx();
    report.tx = tx;
    report.ok = true;
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    report.ok = false;
    report.error = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  }
}

main();
