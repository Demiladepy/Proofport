import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  createDelegatedEvmWalletClient,
  delegatedSignTransaction,
} from "@dynamic-labs-wallet/node-evm";
import type { TransactionSerializable } from "viem";
import { assertDelegationActive, loadDelegation } from "./index";

const CRED_STORE = join(process.cwd(), ".data", "dynamic-delegation-creds.json");

export type DynamicDelegationCreds = {
  walletId: string;
  walletApiKey: string;
  keyShare: unknown;
  accountAddress?: string;
};

export function loadDynamicDelegationCreds(): DynamicDelegationCreds | null {
  if (!existsSync(/* turbopackIgnore: true */ CRED_STORE)) return null;
  return JSON.parse(
    readFileSync(/* turbopackIgnore: true */ CRED_STORE, "utf8"),
  ) as DynamicDelegationCreds;
}

export function hasDynamicDelegationCreds(): boolean {
  return loadDynamicDelegationCreds() !== null;
}

export function saveDynamicDelegationCreds(creds: DynamicDelegationCreds) {
  mkdirSync(/* turbopackIgnore: true */ join(process.cwd(), ".data"), {
    recursive: true,
  });
  writeFileSync(
    /* turbopackIgnore: true */ CRED_STORE,
    JSON.stringify(creds, null, 2),
  );
}

/**
 * Sign a tx with Dynamic delegated access (requires webhook credentials).
 * Call from tsx / Node scripts — not from Turbopack-bundled routes if WASM fails.
 */
export async function delegatedSignTx(
  transaction: TransactionSerializable,
): Promise<string> {
  assertDelegationActive();
  const state = loadDelegation();
  if (state.mode !== "dynamic" && !hasDynamicDelegationCreds()) {
    throw new Error(
      "Dynamic delegated credentials missing — complete client delegation + webhook",
    );
  }
  const creds = loadDynamicDelegationCreds();
  if (!creds) {
    throw new Error("No stored Dynamic delegation credentials");
  }
  const environmentId = process.env.DYNAMIC_ENVIRONMENT_ID;
  const apiKey = process.env.DYNAMIC_API_TOKEN ?? process.env.DYNAMIC_AUTH_TOKEN;
  if (!environmentId || !apiKey) {
    throw new Error("DYNAMIC_ENVIRONMENT_ID / DYNAMIC_API_TOKEN required");
  }

  const client = createDelegatedEvmWalletClient({
    environmentId,
    apiKey,
  });

  return delegatedSignTransaction(client, {
    walletId: creds.walletId,
    walletApiKey: creds.walletApiKey,
    keyShare: creds.keyShare as never,
    transaction,
  });
}
