import { NextRequest, NextResponse } from "next/server";
import {
  isCreditEligible,
  listAttestations,
  readAttestation,
} from "@/reputation";
import type { Hex } from "viem";

function serializeRead(subject: string, rec: Awaited<ReturnType<typeof readAttestation>>) {
  const eligible = isCreditEligible(rec);
  return {
    subject,
    kind: rec.kind,
    evidenceHash: rec.evidenceHash,
    attestedAt: rec.attestedAt.toString(),
    attester: rec.attester,
    piiFields: rec.piiFields,
    creditEligible: eligible,
    acknowledgement: eligible ? "settlement_initiated" : "no_attestation",
  };
}

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get("subject");
  try {
    if (subject) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(subject)) {
        return NextResponse.json({ error: "subject must be bytes32 hex" }, { status: 400 });
      }
      const rec = await readAttestation(subject as Hex);
      return NextResponse.json(serializeRead(subject, rec));
    }
    const items = await listAttestations(20);
    return NextResponse.json({
      items: items.map((item) => serializeRead(item.subject, item)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
