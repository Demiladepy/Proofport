import "dotenv/config";
import {
  grantDelegation,
  revokeDelegation,
  assertDelegationActive,
  loadDelegation,
} from "../../src/delegation";
import { executeSwap } from "../../src/swap";

async function main() {
  process.env.SWAP_PROVIDER = "mock";

  grantDelegation({
    mode: process.env.DYNAMIC_ENVIRONMENT_ID ? "dynamic" : "app_level_fallback",
    note: "Phase 7 smoke grant",
  });

  let grantedOk = false;
  let grantedError: string | undefined;
  try {
    assertDelegationActive();
    await executeSwap({ amountIn: "0.01", fromToken: "ETH", toToken: "USDC" });
    grantedOk = true;
  } catch (e) {
    grantedError = e instanceof Error ? e.message : String(e);
  }

  revokeDelegation();

  let revokedBlocked = false;
  let revokeMessage = "";
  try {
    assertDelegationActive();
    await executeSwap({ amountIn: "0.01", fromToken: "ETH", toToken: "USDC" });
  } catch (e) {
    revokeMessage = e instanceof Error ? e.message : String(e);
    revokedBlocked = revokeMessage.includes("authority revoked");
  }

  const report = {
    mode: loadDelegation().mode,
    grantedRun: { ok: grantedOk, error: grantedError },
    revokedRun: { blocked: revokedBlocked, message: revokeMessage },
    dynamicEnvPresent: Boolean(process.env.DYNAMIC_ENVIRONMENT_ID),
    note: process.env.DYNAMIC_ENVIRONMENT_ID
      ? "App gate enforced; Dynamic webhook credentials optional for full MPC delegated sign"
      : "App-level gate (Dynamic dashboard creds not in env). See MOCKS.md.",
  };
  console.log(JSON.stringify(report, null, 2));

  if (!grantedOk || !revokedBlocked) {
    process.exitCode = 1;
    throw new Error("Phase 7 gate failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
