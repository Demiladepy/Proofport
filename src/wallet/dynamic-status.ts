import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { hasDynamicEnv } from "./dynamic";
import { getMpcProof, probeMpcSigner, type MpcProof } from "./dynamic-mpc";

export type DynamicRailStatus = {
  envReady: boolean;
  wsl: boolean;
  webhookCreds: boolean;
  webhookSecret: boolean;
  /** What will sign the next execution tx, right now. */
  signer: "dynamic_mpc" | "local_viem";
  /** Has this wallet ever produced an on-chain MPC signature? */
  mpcProven: boolean;
  note: string;
  mpcAddress?: string;
  mpcEth?: string;
  mpcProof?: MpcProof;
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

export { probeMpcSigner as probeWslSigner };

export async function getDynamicRailStatus(): Promise<DynamicRailStatus> {
  const envReady = hasDynamicEnv();
  const wsl = hasWsl();
  const webhookFile = join(
    process.cwd(),
    ".data",
    "dynamic-delegation-creds.json",
  );
  const webhookCreds = existsSync(/* turbopackIgnore: true */ webhookFile);
  const webhookSecret = Boolean(process.env.DELEGATION_WEBHOOK_SECRET?.trim());
  const proof = getMpcProof();
  const live = await probeMpcSigner();

  const base = {
    envReady,
    wsl,
    webhookCreds,
    webhookSecret,
    mpcProven: Boolean(proof),
    mpcProof: proof ?? undefined,
  };

  if (live?.ready) {
    return {
      ...base,
      signer: "dynamic_mpc",
      mpcAddress: live.address,
      mpcEth: live.eth,
      note: `Dynamic MPC signer is live. Execution txs are signed by the Dynamic server wallet ${live.address}.`,
    };
  }

  if (proof) {
    return {
      ...base,
      signer: "local_viem",
      mpcAddress: proof.address,
      note: `Dynamic MPC signing is proven on-chain (${proof.txHash}) but the Linux signer is not running, so this process would sign with the local key. Start it with: npm run mpc:serve`,
    };
  }

  if (envReady && wsl) {
    return {
      ...base,
      signer: "local_viem",
      note: "Dynamic credentials and WSL are present but the MPC signer is not running. Start it with: npm run mpc:serve",
    };
  }

  if (envReady) {
    return {
      ...base,
      signer: "local_viem",
      note: "Dynamic credentials are present but there is no Linux runtime for the MPC binaries. Signing is local viem.",
    };
  }

  return {
    ...base,
    signer: "local_viem",
    note: "No Dynamic API credentials. Authority grant is app-level. Signing is local viem.",
  };
}
