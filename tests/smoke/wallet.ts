import "dotenv/config";
import { hasDynamicEnv, sendTinyTestTx, ensureDynamicWallet } from "../../src/wallet/dynamic";
import { grantDelegation } from "../../src/delegation";

async function main() {
  grantDelegation({ mode: "app_level_fallback", note: "smoke:wallet grant" });

  const report: Record<string, unknown> = {
    hasDynamicEnv: hasDynamicEnv(),
  };

  try {
    if (hasDynamicEnv()) {
      const wallet = await ensureDynamicWallet();
      report.wallet = wallet;
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
