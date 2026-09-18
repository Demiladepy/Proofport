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

  return withCookie(
    grantDelegation({
      mode: body.mode ?? "app_level_fallback",
      walletId: body.walletId,
      accountAddress: body.accountAddress,
      note: "Granted via /api/delegation",
    }),
  );
}
