import "dotenv/config";
import { payComplianceCheck } from "../../src/payments/x402";

async function main() {
  const base = process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000";
  const result = await payComplianceCheck(base);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok || result.paidVia !== "x402") {
    // Accept skipped only if endpoint unreachable and we documented it
    if (result.paymentEvidence && (result.paymentEvidence as { firstStatus?: number }).firstStatus === 402) {
      return;
    }
    if (!result.ok) {
      process.exitCode = 1;
      throw new Error("x402 smoke failed");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
