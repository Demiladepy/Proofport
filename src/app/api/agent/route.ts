import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/orchestrator";
import {
  DELEGATION_COOKIE,
  loadDelegation,
  parseDelegationJson,
  setRequestDelegation,
} from "@/delegation";

export async function POST(req: NextRequest) {
  const fromCookie = parseDelegationJson(
    req.cookies.get(DELEGATION_COOKIE)?.value,
  );
  if (fromCookie) setRequestDelegation(fromCookie);

  try {
    const body = (await req.json()) as {
      message?: string;
      recipient?: string;
      amount?: string;
      country?: string;
    };
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const del = loadDelegation();
    if (!del.granted) {
      return NextResponse.json(
        {
          error: "authority revoked",
          toolCalls: [],
          capabilityBlocks: [],
          text: "authority revoked",
          mode: "blocked",
        },
        { status: 403 },
      );
    }

    const result = await runOrchestrator({
      message,
      recipient: body.recipient,
      amount: body.amount,
      country: body.country,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("authority revoked")) {
      return NextResponse.json(
        {
          error: "authority revoked",
          toolCalls: [],
          capabilityBlocks: [],
          text: msg,
          mode: "blocked",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    setRequestDelegation(null);
  }
}
