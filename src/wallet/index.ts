/**
 * Lightweight wallet surface for the agent (no Dynamic SDK in this module).
 * Use src/wallet/dynamic.ts from smoke tests or /api/wallet routes only.
 */
import type { Address, Hex } from "viem";
import { assertDelegationActive } from "@/delegation";

export type AgentWalletInfo = {
  address?: Address;
  ready: boolean;
  mode: "dynamic" | "stub";
  note?: string;
};

let cached: AgentWalletInfo = {
  ready: false,
  mode: "stub",
  note: "Dynamic wallet not initialized — POST /api/wallet/init or run smoke:wallet",
};

export function getWalletInfo(): AgentWalletInfo {
  return { ...cached };
}

export function setWalletInfo(info: AgentWalletInfo) {
  cached = info;
}

export async function checkWallet(): Promise<AgentWalletInfo> {
  assertDelegationActive();
  return getWalletInfo();
}

export type SendTxResult = {
  txHash: Hex | `stub_${string}`;
  explorerUrl?: string;
};
