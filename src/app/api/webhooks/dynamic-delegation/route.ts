import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { grantDelegation } from "@/delegation";

const CRED_STORE = join(process.cwd(), ".data", "dynamic-delegation-creds.json");

/**
 * Dynamic webhook: wallet.delegation.created
 * Stores walletId / walletApiKey / keyShare for server-side delegated signing.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.DELEGATION_WEBHOOK_SECRET;
  if (secret) {
    const hdr = req.headers.get("x-dynamic-webhook-secret");
    if (hdr !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const body = (await req.json()) as {
    eventName?: string;
    data?: {
      walletId?: string;
      walletApiKey?: string;
      keyShare?: unknown;
      accountAddress?: string;
    };
  };

  const data = body.data ?? (body as unknown as typeof body.data);
  if (!data?.walletId || !data?.walletApiKey || !data?.keyShare) {
    return NextResponse.json(
      { error: "missing delegation credentials" },
      { status: 400 },
    );
  }

  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(/* turbopackIgnore: true */ join(process.cwd(), ".data"), {
    recursive: true,
  });
  writeFileSync(
    /* turbopackIgnore: true */ CRED_STORE,
    JSON.stringify(
      {
        walletId: data.walletId,
        walletApiKey: data.walletApiKey,
        keyShare: data.keyShare,
        accountAddress: data.accountAddress,
        receivedAt: new Date().toISOString(),
        eventName: body.eventName ?? "wallet.delegation.created",
      },
      null,
      2,
    ),
  );

  grantDelegation({
    mode: "dynamic",
    walletId: data.walletId,
    accountAddress: data.accountAddress,
    note: "Dynamic delegated-access credentials received via webhook",
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (!existsSync(/* turbopackIgnore: true */ CRED_STORE)) {
    return NextResponse.json({ hasCredentials: false });
  }
  const raw = JSON.parse(
    readFileSync(/* turbopackIgnore: true */ CRED_STORE, "utf8"),
  ) as { walletId: string; accountAddress?: string };
  return NextResponse.json({
    hasCredentials: true,
    walletId: raw.walletId,
    accountAddress: raw.accountAddress,
  });
}
