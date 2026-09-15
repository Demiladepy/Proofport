import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type DelegationState = {
  granted: boolean;
  mode: "dynamic" | "app_level_fallback";
  walletId?: string;
  accountAddress?: string;
  grantedAt?: string;
  revokedAt?: string;
  note?: string;
};

function storePath() {
  return join(
    process.cwd(),
    ".data",
    process.env.DELEGATION_STORE?.replace(/^\.data[/\\]/, "") ?? "delegation.json",
  );
}

export function loadDelegation(): DelegationState {
  const path = storePath();
  if (!existsSync(/* turbopackIgnore: true */ path)) {
    return {
      granted: true,
      mode: "app_level_fallback",
      note: "Default demo grant until Dynamic delegated-access wired (Phase 7)",
      grantedAt: new Date().toISOString(),
    };
  }
  return JSON.parse(
    readFileSync(/* turbopackIgnore: true */ path, "utf8"),
  ) as DelegationState;
}

export function saveDelegation(state: DelegationState) {
  const path = storePath();
  mkdirSync(/* turbopackIgnore: true */ join(process.cwd(), ".data"), {
    recursive: true,
  });
  writeFileSync(/* turbopackIgnore: true */ path, JSON.stringify(state, null, 2));
}

export function grantDelegation(partial?: Partial<DelegationState>): DelegationState {
  const state: DelegationState = {
    granted: true,
    mode: partial?.mode ?? "app_level_fallback",
    walletId: partial?.walletId,
    accountAddress: partial?.accountAddress,
    grantedAt: new Date().toISOString(),
    note: partial?.note,
  };
  saveDelegation(state);
  return state;
}

export function revokeDelegation(): DelegationState {
  const prev = loadDelegation();
  const state: DelegationState = {
    ...prev,
    granted: false,
    revokedAt: new Date().toISOString(),
    note: "authority revoked",
  };
  saveDelegation(state);
  return state;
}

export function assertDelegationActive(): void {
  const state = loadDelegation();
  if (!state.granted) {
    throw new Error("authority revoked");
  }
}
