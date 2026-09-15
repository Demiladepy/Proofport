import { NextRequest, NextResponse } from "next/server";
import { requestPartnerHandoff } from "@/partner";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    presentation?: string;
    destinationBank?: string;
    amountUsd?: string;
  };

  if (!body.presentation) {
    return NextResponse.json(
      { status: "rejected", reason: "presentation required" },
      { status: 400 },
    );
  }

  const result = await requestPartnerHandoff({
    presentation: body.presentation,
    destinationBank: body.destinationBank ?? "Zenith",
    amountUsd: body.amountUsd ?? "500",
  });

  const code = result.status === "settlement_initiated" ? 200 : 400;
  return NextResponse.json(result, { status: code });
}
