import "dotenv/config";
import { createHash } from "node:crypto";
import { grantDelegation } from "../../src/delegation";
import { writeAttestation, readAttestation } from "../../src/reputation";
import type { Hex } from "viem";

async function main() {
  grantDelegation({ mode: "app_level_fallback" });

  const evidenceHash = (`0x` +
    createHash("sha256").update("verified:true|v=1").digest("hex")) as Hex;
  const subject = (`0x` +
    createHash("sha256")
      .update("proofport:subject:demo-user")
      .digest("hex")) as Hex;
  const kind = (`0x` +
    createHash("sha256")
      .update("proofport:kind:cashout_verified")
      .digest("hex")) as Hex;

  const written = await writeAttestation({ subject, kind, evidenceHash });
  const read = await readAttestation(subject);

  const readSafe = {
    kind: read.kind,
    evidenceHash: read.evidenceHash,
    attestedAt: read.attestedAt.toString(),
    attester: read.attester,
    piiFields: read.piiFields,
  };
  const serialized = JSON.stringify(readSafe);
  const piiLeak =
    /Ada|Okonkwo|NIN-|full_name|id_number/i.test(serialized) &&
    serialized.includes("full_name");

  const report = {
    write: written,
    read: readSafe,
    noPii: read.piiFields.length === 0 && !piiLeak,
    hashesMatch:
      read.evidenceHash.toLowerCase() === evidenceHash.toLowerCase() &&
      read.kind.toLowerCase() === kind.toLowerCase(),
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.noPii || !report.hashesMatch) {
    process.exitCode = 1;
    throw new Error("reputation gate failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
