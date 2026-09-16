import "dotenv/config";
import {
  ensureDualWallets,
  sendExecutionTinyTx,
  getDualWallets,
} from "../../src/wallet/dual";
import { grantDelegation } from "../../src/delegation";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";

async function main() {
  grantDelegation({ mode: "app_level_fallback", note: "smoke:wallet dual" });
  const wallets = await ensureDualWallets();
  const store = getDualWallets();
  const distinct =
    store.proof.address.toLowerCase() !==
    store.execution.address.toLowerCase();

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
  });
  const bal = await client.getBalance({ address: store.execution.address });

  const report: Record<string, unknown> = {
    distinct,
    proofAddress: store.proof.address,
    executionAddress: store.execution.address,
    executionEth: formatEther(bal),
    wallets,
    note: store.note,
  };

  if (!distinct) {
    console.log(JSON.stringify({ ...report, ok: false, error: "addresses not distinct" }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (bal === 0n) {
    report.ok = true;
    report.tx = null;
    report.nextStep = "Fund execution wallet on Base Sepolia, then re-run";
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const tx = await sendExecutionTinyTx();
  report.tx = tx;
  report.ok = true;
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
