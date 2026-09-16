import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createWalletClient,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { assertDelegationActive } from "@/delegation";
import { setWalletInfo, type AgentWalletInfo, type SendTxResult } from "./index";

const STORE =
  process.env.DYNAMIC_WALLET_STORE ??
  join(process.cwd(), ".data", "wallet.json");
const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

type PersistedWallet = {
  mode: "dynamic" | "local_viem";
  walletMetadata?: unknown;
  externalServerKeyShares?: unknown;
  accountAddress?: Address;
  note?: string;
};

function saveStore(data: PersistedWallet) {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(data, null, 2));
}

function loadStore(): PersistedWallet | null {
  if (!existsSync(STORE)) return null;
  return JSON.parse(readFileSync(STORE, "utf8")) as PersistedWallet;
}

export function hasDynamicEnv(): boolean {
  return Boolean(
    process.env.DYNAMIC_ENVIRONMENT_ID &&
      (process.env.DYNAMIC_API_TOKEN || process.env.DYNAMIC_AUTH_TOKEN),
  );
}

export async function createAuthenticatedEvmClient() {
  const { DynamicEvmWalletClient } = await import(
    "@dynamic-labs-wallet/node-evm"
  );
  const environmentId = process.env.DYNAMIC_ENVIRONMENT_ID!;
  const token =
    process.env.DYNAMIC_API_TOKEN ?? process.env.DYNAMIC_AUTH_TOKEN!;
  const client = new DynamicEvmWalletClient({
    environmentId,
    enableMPCAccelerator: false,
  });
  await client.authenticateApiToken(token);
  return client;
}

export async function ensureDynamicWallet(): Promise<AgentWalletInfo> {
  assertDelegationActive();
  const existing = loadStore();
  if (existing?.accountAddress && existing.mode === "dynamic") {
    const info: AgentWalletInfo = {
      address: existing.accountAddress,
      ready: true,
      mode: "dynamic",
      note: existing.note,
    };
    setWalletInfo(info);
    return info;
  }

  if (!hasDynamicEnv()) {
    throw new Error(
      "Missing DYNAMIC_ENVIRONMENT_ID / DYNAMIC_API_TOKEN — cannot create Dynamic server wallet",
    );
  }

  const { ThresholdSignatureScheme } = await import(
    "@dynamic-labs-wallet/node"
  );
  const client = await createAuthenticatedEvmClient();
  const password = process.env.DYNAMIC_WALLET_PASSWORD ?? "proofport-demo-pw";
  const { walletMetadata, externalServerKeyShares } =
    await client.createWalletAccount({
      thresholdSignatureScheme: ThresholdSignatureScheme.TWO_OF_TWO,
      password,
      backUpToDynamic: true,
    });

  const accountAddress = (walletMetadata as { accountAddress: Address })
    .accountAddress;
  saveStore({
    mode: "dynamic",
    walletMetadata,
    externalServerKeyShares,
    accountAddress,
    note: "Dynamic server wallet (backUpToDynamic: true)",
  });

  const info: AgentWalletInfo = {
    address: accountAddress,
    ready: true,
    mode: "dynamic",
  };
  setWalletInfo(info);
  return info;
}

export async function sendDynamicTinyTx(
  to?: Address,
): Promise<SendTxResult> {
  assertDelegationActive();
  const store = loadStore();
  if (!store?.walletMetadata || !store.accountAddress) {
    await ensureDynamicWallet();
  }
  const fresh = loadStore()!;
  const from = fresh.accountAddress!;
  const recipient = to ?? from;

  const client = await createAuthenticatedEvmClient();
  const publicClient = client.createViemPublicClient({
    chain: baseSepolia,
    rpcUrl: RPC,
  });

  const preparedTx = await publicClient.prepareTransactionRequest({
    to: recipient,
    value: parseEther("0.000001"),
    chain: baseSepolia,
    account: from,
  });

  const signedTx = await client.signTransaction({
    // SDK types are strict; persisted JSON is WalletMetadata at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletMetadata: fresh.walletMetadata as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: preparedTx as any,
    password: process.env.DYNAMIC_WALLET_PASSWORD ?? "proofport-demo-pw",
  });

  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(RPC),
    account: from,
  });

  const txHash = await walletClient.sendRawTransaction({
    serializedTransaction: signedTx as Hex,
  });

  return {
    txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
  };
}

export async function ensureLocalViemWallet(): Promise<AgentWalletInfo> {
  assertDelegationActive();
  const existing = loadStore();
  if (existing?.accountAddress && existing.mode === "local_viem") {
    const info: AgentWalletInfo = {
      address: existing.accountAddress,
      ready: true,
      mode: "stub",
      note: existing.note ?? "local_viem fallback (Windows — Dynamic Neon unsupported)",
    };
    setWalletInfo(info);
    return info;
  }

  const pk = process.env.DEMO_AGENT_PRIVATE_KEY ?? process.env.FAUCET_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "Set DEMO_AGENT_PRIVATE_KEY in .env (Windows cannot use Dynamic Node MPC / Neon)",
    );
  }
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex,
  );
  saveStore({
    mode: "local_viem",
    accountAddress: account.address,
    note: "LOCAL VIEM FALLBACK — Dynamic Neon unsupported on win32. See MOCKS.md.",
  });
  const info: AgentWalletInfo = {
    address: account.address,
    ready: true,
    mode: "stub",
    note: "local_viem fallback (Windows)",
  };
  setWalletInfo(info);
  return info;
}

/**
 * Local viem fallback for on-chain smoke when Dynamic creds unavailable / Windows.
 * Documented in MOCKS.md — NOT a Dynamic server wallet.
 */
export async function sendLocalViemTinyTx(): Promise<SendTxResult> {
  assertDelegationActive();
  const info = await ensureLocalViemWallet();
  const pk = process.env.DEMO_AGENT_PRIVATE_KEY ?? process.env.FAUCET_PRIVATE_KEY;
  if (!pk || !info.address) {
    throw new Error("No DEMO_AGENT_PRIVATE_KEY / FAUCET_PRIVATE_KEY for local fallback");
  }
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex,
  );
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC),
  });
  const txHash = await walletClient.sendTransaction({
    to: account.address,
    value: parseEther("0.000001"),
  });
  return {
    txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
  };
}

function isWindowsDynamicUnsupported(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("unsupported system: win32") ||
    msg.includes("Neon:") ||
    msg.includes("only {darwin/linux}")
  );
}

export async function sendTinyTestTx(): Promise<SendTxResult> {
  if (hasDynamicEnv()) {
    try {
      return await sendDynamicTinyTx();
    } catch (err) {
      if (isWindowsDynamicUnsupported(err)) {
        return sendLocalViemTinyTx();
      }
      // unfunded local/dynamic still surfaces; also fall back if create never worked
      if (
        process.env.DEMO_AGENT_PRIVATE_KEY ||
        process.env.FAUCET_PRIVATE_KEY
      ) {
        try {
          return await sendLocalViemTinyTx();
        } catch {
          throw err;
        }
      }
      throw err;
    }
  }
  return sendLocalViemTinyTx();
}
