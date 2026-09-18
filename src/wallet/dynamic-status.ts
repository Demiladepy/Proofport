import { existsSync, readFileSync } from "node:fs";
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
  const storePath = join(process.cwd(), ".data", "wallet.json");
  const hasPersistedDynamic =
    existsSync(storePath) &&
    (() => {
      try {
        const j = JSON.parse(readFileSync(storePath, "utf8")) as {
          mode?: string;
          accountAddress?: string;
        };
        return j.mode === "dynamic" && Boolean(j.accountAddress);
      } catch {
        return false;
      }
    })();

  const webhookSecret = Boolean(process.env.DELEGATION_WEBHOOK_SECRET?.trim());
  const live = await probeWslSigner();
  if (live?.ok && live.address) {
    return {
      envReady,
      wsl,
      webhookCreds,
      webhookSecret,
      signer: "wsl_mpc",
      mpcAddress: live.address,
      mpcEth: live.eth,
      note: "Dynamic MPC via WSL. Value-moving txs use the funded execution wallet until this address has ETH.",
    };
  }

  if (live?.ok) {
    return {
      envReady,
      wsl,
      webhookCreds,
      webhookSecret,
      signer: "local_viem",
      note: webhookSecret
        ? "Dynamic WSL signer is up. Webhook secret is set. Cash-out still uses the bridged execution wallet until POST /create mints and funds an MPC address."
        : "Dynamic WSL signer is up. Cash-out still uses the bridged execution wallet. POST /create on the signer to mint an MPC address, then fund it.",
    };
  }

  if (envReady && wsl) {
    return {
      envReady,
      wsl,
      webhookCreds,
      webhookSecret,
      signer: "local_viem",
      note: hasPersistedDynamic
        ? "Dynamic env + WSL ready. Start the Linux signer to use Neon MPC. Cash-out still signs with the bridged execution wallet."
        : "Dynamic credentials are set. Neon MPC needs the WSL signer running. Cash-out signs with the bridged execution wallet.",
    };
  }

  if (envReady) {
    return {
      envReady,
      wsl,
      webhookCreds,
      webhookSecret,
      signer: "local_viem",
      note: "Dynamic credentials are set. Neon MPC does not load on native Windows. Cash-out signs with the bridged execution wallet.",
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
