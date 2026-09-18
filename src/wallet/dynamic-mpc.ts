/**
 * App-side client for the Dynamic MPC signer sidecar.
 *
 * The Dynamic node SDK ships MPC binaries for linux/macos only, so on Windows
 * the signing happens out-of-process in WSL (scripts/dynamic-wsl-signer.mjs).
 * This module is the only thing the product talks to; it never loads the SDK.
 *
 * `getMpcProof()` reads the receipt of the last successful MPC signature so the
 * UI can cite a real hash even when the sidecar is not currently running.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Address, Hex } from "viem";
import { assertDelegationActive } from "@/delegation";

const SIGNER_URL =
  process.env.DYNAMIC_WSL_SIGNER_URL ?? "http://127.0.0.1:18787";
const PROOF_FILE = join(process.cwd(), ".data", "dynamic-mpc-proof.json");

export type MpcProof = {
  address: Address;
  txHash: Hex;
  explorerUrl: string;
  chain: string;
  signer: "dynamic_mpc";
  status?: string;
  signedAt: string;
};

export type MpcHealth = {
  ok: boolean;
  ready: boolean;
  signer: "dynamic_mpc";
  address?: Address;
  eth?: string;
  note?: string;
  lastProof?: MpcProof | null;
};

/** Receipt of the last successful MPC signature, if one has ever happened. */
export function getMpcProof(): MpcProof | null {
  if (!existsSync(/* turbopackIgnore: true */ PROOF_FILE)) return null;
  try {
    return JSON.parse(
      readFileSync(/* turbopackIgnore: true */ PROOF_FILE, "utf8"),
    ) as MpcProof;
  } catch {
    return null;
  }
}

/** Is the Linux sidecar reachable and holding a Dynamic wallet right now? */
export async function probeMpcSigner(
  timeoutMs = 1200,
): Promise<MpcHealth | null> {
  try {
    const res = await fetch(`${SIGNER_URL}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as MpcHealth;
    return body.ok ? body : null;
  } catch {
    return null;
  }
}

/**
 * Make the Dynamic server wallet sign and broadcast a transaction.
 * Defaults to a 0.000001 ETH self-transfer — the smallest thing that puts the
 * MPC wallet's address in the `from` field of a real block.
 */
export async function mpcSignAndSend(
  tx: { to?: Address; value?: string; data?: Hex } = {},
  timeoutMs = 190_000,
): Promise<MpcProof> {
  assertDelegationActive();
  const res = await fetch(`${SIGNER_URL}/sign`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(tx),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await res.json()) as MpcProof & { ok: boolean; error?: string };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? `MPC signer returned ${res.status}`);
  }
  if (body.status && body.status !== "success") {
    throw new Error(`MPC tx did not succeed: ${body.txHash}`);
  }
  return body;
}
