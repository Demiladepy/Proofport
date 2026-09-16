import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Hex } from "viem";
import {
  deployReputationContract,
  saveContractAddress,
} from "../src/reputation";
import { ensureDualWallets } from "../src/wallet/dual";
import { grantDelegation } from "../src/delegation";

async function main() {
  grantDelegation({ mode: "app_level_fallback" });
  const wallets = await ensureDualWallets();
  console.log(JSON.stringify({ wallets }, null, 2));

  const bcPath = join(process.cwd(), ".data", "reputation-bytecode.txt");
  if (!existsSync(bcPath)) {
    throw new Error("Run npx tsx scripts/compile-reputation.ts first");
  }
  const bytecode = readFileSync(bcPath, "utf8").trim() as Hex;
  const address = await deployReputationContract(bytecode);
  saveContractAddress(address);
  console.log(
    JSON.stringify(
      {
        ok: true,
        address,
        explorer: `https://sepolia.basescan.org/address/${address}`,
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
