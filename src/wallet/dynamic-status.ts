import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { hasDynamicEnv } from "./dynamic";

const SIGNER_URL = process.env.DYNAMIC_WSL_SIGNER_URL ?? "http://127.0.0.1:18787";

export type DynamicRailStatus = {
  envReady: boolean;
  wsl: boolean;
  webhookCreds: boolean;
  webhookSecret: boolean;
  signer: "wsl_mpc" | "local_viem";
  note: string;
  mpcAddress?: string;
  mpcEth?: string;
};

let wslCached: boolean | null = null;

export function hasWsl(): boolean {
  if (process.platform !== "win32") {
    return process.platform === "linux";
  }
  if (wslCached !== null) return wslCached;
  try {
    execFileSync("wsl", ["-e", "uname"], {
      timeout: 2500,
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: true,
    });
    wslCached = true;
  } catch {
    wslCached = false;
  }
  return wslCached;
}

export async function probeWslSigner(): Promise<{
  ok: boolean;
  ready?: boolean;
  address?: string;
  eth?: string;
  note?: string;
} | null> {
  try {
    const res = await fetch(`${SIGNER_URL}/health`, {
      signal: AbortSignal.timeout(600),
    });
    if (!res.ok) return null;
    return (await res.json()) as { ok: boolean; address?: string; eth?: string };
  } catch {
    return null;
  }
}

export async function getDynamicRailStatus(): Promise<DynamicRailStatus> {
  const envReady = hasDynamicEnv();
  const wsl = hasWsl();
  const webhookFile = join(process.cwd(), ".data", "dynamic-delegation-creds.json");
  const webhookCreds = existsSync(webhookFile);
  const webhookSecret = Boolean(process.env.DELEGATION_WEBHOOK_SECRET?.trim());
  const live = await probeWslSigner();
  const blockedNote =
    "Delegated authority (Grant/Revoke) is LIVE; Dynamic MPC minting is BLOCKED upstream (API timeout); execution signs with a bridged local key.";

  if (live?.ok) {
    return {
      envReady,
      wsl,
      webhookCreds,
      webhookSecret,
      signer: "local_viem",
      note: blockedNote,
    };
  }

  if (envReady && wsl) {
    return {
      envReady,
      wsl,
      webhookCreds,
      webhookSecret,
      signer: "local_viem",
      note: blockedNote,
    };
  }

  if (envReady) {
    return {
      envReady,
      wsl,
      webhookCreds,
      webhookSecret,
      signer: "local_viem",
      note: blockedNote,
    };
  }

  return {
    envReady,
    wsl,
    webhookCreds,
    webhookSecret,
    signer: "local_viem",
    note: "No Dynamic API credentials. Authority grant is app-level. Signing is local viem.",
  };
}
