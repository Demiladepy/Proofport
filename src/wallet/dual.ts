/**
 * Dual agent wallets (Proofport v2).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createWalletClient,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { assertDelegationActive } from "@/delegation";
import { setWalletInfo, type AgentWalletInfo, type SendTxResult } from "./index";

const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
const STORE = join(process.cwd(), ".data", "wallets-v2.json");
const PROOF_KEY_FILE = join(process.cwd(), ".data", "proof-agent.key");

export type DualWalletStore = {
  proof: { address: Address };
  execution: { address: Address };
  note: string;
};

function normalizePk(raw: string): Hex {
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

export function getExecutionPrivateKey(): Hex {
  const raw =
    process.env.EXECUTION_AGENT_PRIVATE_KEY ??
    process.env.DEMO_AGENT_PRIVATE_KEY ??
    process.env.FAUCET_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "Set EXECUTION_AGENT_PRIVATE_KEY or DEMO_AGENT_PRIVATE_KEY",
    );
  }
  return normalizePk(raw);
}

/** Survives a read-only filesystem (Vercel): key stays in memory for the process. */
let memoryProofKey: Hex | null = null;

export function getProofPrivateKey(): Hex {
  if (process.env.PROOF_AGENT_PRIVATE_KEY) {
    return normalizePk(process.env.PROOF_AGENT_PRIVATE_KEY);
  }
  if (memoryProofKey) return memoryProofKey;
  try {
    mkdirSync(join(process.cwd(), ".data"), { recursive: true });
    if (existsSync(PROOF_KEY_FILE)) {
      return normalizePk(readFileSync(PROOF_KEY_FILE, "utf8").trim());
    }
  } catch {
    // read-only filesystem — fall through to an ephemeral key
  }
  const generated = generatePrivateKey();
  memoryProofKey = generated;
  try {
    writeFileSync(PROOF_KEY_FILE, generated, "utf8");
  } catch {
    // Vercel: the proof-agent wallet is ephemeral. It signs nothing on-chain;
    // it only needs to be a distinct address from the execution agent.
  }
  return generated;
}

export function getDualWallets(): DualWalletStore {
  try {
    mkdirSync(join(process.cwd(), ".data"), { recursive: true });
  } catch {
    // read-only filesystem (Vercel) — addresses are still derivable
  }
  const execution = privateKeyToAccount(getExecutionPrivateKey());
  let proof = privateKeyToAccount(getProofPrivateKey());
  if (proof.address.toLowerCase() === execution.address.toLowerCase()) {
    const regenerated = generatePrivateKey();
    memoryProofKey = regenerated;
    try {
      writeFileSync(PROOF_KEY_FILE, regenerated, "utf8");
    } catch {
      // ephemeral — see getProofPrivateKey
    }
    proof = privateKeyToAccount(regenerated);
  }
  const store: DualWalletStore = {
    proof: { address: proof.address },
    execution: { address: execution.address },
    note: "local_viem dual wallets (execution key signs swap + attestation)",
  };
  try {
    writeFileSync(STORE, JSON.stringify(store, null, 2));
  } catch {
    // Vercel: nothing downstream reads this file when the call succeeds
  }
  return store;
}

export async function ensureDualWallets(): Promise<{
  proof: AgentWalletInfo;
  execution: AgentWalletInfo;
}> {
  assertDelegationActive();
  const store = getDualWallets();
  const execution: AgentWalletInfo = {
    address: store.execution.address,
    ready: true,
    mode: "stub",
    note: "execution-agent wallet",
  };
  const proof: AgentWalletInfo = {
    address: store.proof.address,
    ready: true,
    mode: "stub",
    note: "proof-agent wallet",
  };
  setWalletInfo(execution);
  return { proof, execution };
}

export async function sendExecutionTinyTx(): Promise<SendTxResult> {
  assertDelegationActive();
  await ensureDualWallets();
  const account = privateKeyToAccount(getExecutionPrivateKey());
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
