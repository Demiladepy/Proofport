import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "dotenv";

const ROOT =
  process.env.PROOFPORT_ROOT ??
  "/mnt/c/Users/User/Desktop/summerofbitcoin/proofport";
config({ path: join(ROOT, ".env") });

const STORE = join(ROOT, ".data", "wallet.json");

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function main() {
  if (existsSync(STORE)) {
    const existing = JSON.parse(readFileSync(STORE, "utf8"));
    if (existing?.mode === "dynamic" && existing.accountAddress) {
      console.log(JSON.stringify({ ok: true, existed: true, address: existing.accountAddress }));
      return;
    }
  }

  const { DynamicEvmWalletClient } = await import(
    "@dynamic-labs-wallet/node-evm"
  );
  const { ThresholdSignatureScheme } = await import(
    "@dynamic-labs-wallet/node"
  );
  const environmentId = process.env.DYNAMIC_ENVIRONMENT_ID;
  const token =
    process.env.DYNAMIC_API_TOKEN ?? process.env.DYNAMIC_AUTH_TOKEN;
  if (!environmentId || !token) {
    throw new Error("DYNAMIC_ENVIRONMENT_ID / DYNAMIC_API_TOKEN missing");
  }

  const client = new DynamicEvmWalletClient({
    environmentId,
    enableMPCAccelerator: false,
  });
  await client.authenticateApiToken(token);
  const password = process.env.DYNAMIC_WALLET_PASSWORD ?? "proofport-demo-pw";
  const { walletMetadata, externalServerKeyShares } = await withTimeout(
    client.createWalletAccount({
      thresholdSignatureScheme: ThresholdSignatureScheme.TWO_OF_TWO,
      password,
      backUpToDynamic: true,
    }),
    40000,
    "Dynamic createWalletAccount",
  );
  const accountAddress = walletMetadata.accountAddress;
  const saved = {
    mode: "dynamic",
    walletMetadata,
    externalServerKeyShares,
    accountAddress,
    note: "Dynamic server wallet via WSL Neon",
  };
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(saved, null, 2));
  console.log(JSON.stringify({ ok: true, address: accountAddress }));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
