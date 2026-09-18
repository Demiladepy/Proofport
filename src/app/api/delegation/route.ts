import { NextRequest, NextResponse } from "next/server";
import {
  DELEGATION_COOKIE,
  grantDelegation,
  loadDelegation,
  parseDelegationJson,
  revokeDelegation,
  type DelegationState,
} from "@/delegation";

const COOKIE = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: false,
  maxAge: 60 * 60 * 24 * 7,
};

function withCookie(state: DelegationState) {
  const res = NextResponse.json(state);
  res.cookies.set(DELEGATION_COOKIE, JSON.stringify(state), COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const fromCookie = parseDelegationJson(
    req.cookies.get(DELEGATION_COOKIE)?.value,
  );
  return NextResponse.json(fromCookie ?? loadDelegation());
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "grant" | "revoke";
    mode?: "dynamic" | "app_level_fallback";
    walletId?: string;
    accountAddress?: string;
  };

  if (body.action === "revoke") {
    return withCookie(revokeDelegation());
  }

  // When the Dynamic MPC signer is actually up, the authority being granted
  // governs that server wallet — say so. Otherwise stay honest: app-level.
  let mode = body.mode;
  let accountAddress = body.accountAddress;
  let note = "Granted via /api/delegation";
  if (!mode) {
    const { probeMpcSigner } = await import("@/wallet/dynamic-mpc");
    const live = await probeMpcSigner();
    if (live?.ready && live.address) {
      mode = "dynamic";
      accountAddress ??= live.address;
      note = `Granted via /api/delegation — authority over Dynamic MPC wallet ${live.address}`;
    } else {
      mode = "app_level_fallback";
    }
  }

  return withCookie(
    grantDelegation({
      mode,
      walletId: body.walletId,
      accountAddress,
      note,
    }),
  );
}
