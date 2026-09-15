import { NextResponse } from "next/server";
import {
  grantDelegation,
  revokeDelegation,
  loadDelegation,
} from "@/delegation";

export async function GET() {
  return NextResponse.json(loadDelegation());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "grant" | "revoke";
    mode?: "dynamic" | "app_level_fallback";
    walletId?: string;
    accountAddress?: string;
  };

  if (body.action === "revoke") {
    return NextResponse.json(revokeDelegation());
  }

  return NextResponse.json(
    grantDelegation({
      mode: body.mode ?? "app_level_fallback",
      walletId: body.walletId,
      accountAddress: body.accountAddress,
      note: "Granted via /api/delegation",
    }),
  );
}
