import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/agent";
import { grantDelegation, loadDelegation } from "@/delegation";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { message?: string };
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // Ensure demo starts with authority unless revoked
  const del = loadDelegation();
  if (!del.revokedAt && !del.granted) {
    grantDelegation({ mode: del.mode });
  }

  try {
    const result = await runAgent(message);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("authority revoked")) {
      return NextResponse.json(
        { error: "authority revoked", toolCalls: [], text: msg, mode: "blocked" },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
