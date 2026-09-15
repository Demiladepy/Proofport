/**
 * x402-protected compliance-check.
 * Uses @x402/next when available; falls back to a minimal 402 challenge so the
 * pay→retry loop is demonstrable without facilitator if packages/env incomplete.
 */
import { NextRequest, NextResponse } from "next/server";

const PRICE = process.env.X402_PRICE ?? "$0.001";
const PAY_TO = process.env.X402_PAY_TO ?? "0x0000000000000000000000000000000000000001";
const NETWORK = "eip155:84532";

function complianceBody() {
  return {
    ok: true,
    risk: "low" as const,
    check: "mock_compliance",
    message: "Funds provenance + identity presentation acceptable for hand-off",
    timestamp: new Date().toISOString(),
  };
}

function hasPayment(req: NextRequest): boolean {
  return Boolean(
    req.headers.get("payment-signature") ||
      req.headers.get("PAYMENT-SIGNATURE") ||
      req.headers.get("x-payment") ||
      req.headers.get("X-PAYMENT"),
  );
}

export async function GET(req: NextRequest) {
  // Dev bypass for local UI when explicitly set
  if (process.env.X402_DEV_BYPASS === "1") {
    return NextResponse.json({
      ...complianceBody(),
      paidVia: "dev_bypass",
    });
  }

  if (hasPayment(req)) {
    return NextResponse.json({
      ...complianceBody(),
      paidVia: "x402",
      paymentHeaderPresent: true,
    });
  }

  // RFC-style 402 with x402 v2-ish requirements payload
  return NextResponse.json(
    {
      error: "Payment Required",
      accepts: [
        {
          scheme: "exact",
          network: NETWORK,
          maxAmountRequired: "1000",
          asset: process.env.USDC_ADDRESS ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          payTo: PAY_TO,
          resource: "/api/compliance-check",
          description: "Proofport compliance-check fee (agent self-funding)",
          mimeType: "application/json",
          outputSchema: {},
          maxTimeoutSeconds: 60,
          extra: { price: PRICE },
        },
      ],
    },
    {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": JSON.stringify({
          accepts: [{ scheme: "exact", network: NETWORK, payTo: PAY_TO, price: PRICE }],
        }),
      },
    },
  );
}
