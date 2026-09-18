import "dotenv/config";
import { grantDelegation } from "../src/delegation";
import { runOrchestrator } from "../src/orchestrator";
import { readAttestation } from "../src/reputation";
import type { Hex } from "viem";

async function readUntil(subject: Hex, tries = 10) {
  let last = await readAttestation(subject);
  for (let i = 0; i < tries && last.attestedAt === 0n; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    last = await readAttestation(subject);
  }
  return last;
}

async function main() {
  grantDelegation({ mode: "app_level_fallback" });
  process.env.SWAP_PROVIDER = process.env.SWAP_PROVIDER ?? "mock";

  const a = await runOrchestrator({
    message: "Cash out my $500 reward to Zenith in Nigeria",
    recipient: "Zenith",
    amount: "500",
    country: "NG",
  });

  await new Promise((r) => setTimeout(r, 2000));

  const b = await runOrchestrator({
    message:
      "Age-gated payout: prove I am over 18 to collect the reward, no bank country needed",
    recipient: "Access",
    amount: "50",
    country: "NG",
  });

  const readA = a.reputation?.subject
    ? await readUntil(a.reputation.subject as Hex)
    : null;
  const readB = b.reputation?.subject
    ? await readUntil(b.reputation.subject as Hex)
    : null;

  const report = {
    traceA: {
      claims: a.disclosure?.claims,
      source: a.disclosure?.source,
      rationale: a.disclosure?.rationale,
      recipient: a.request?.recipient,
      amount: a.request?.amount,
      country: a.request?.country,
      subject: a.reputation?.subject,
      tx: a.reputation?.txHash,
      explorer: a.reputation?.explorerUrl,
      blocks: a.capabilityBlocks.length,
      deny: a.capabilityBlocks.map(
        (c) => (c.output as { error?: string }).error,
      ),
    },
    traceB: {
      claims: b.disclosure?.claims,
      source: b.disclosure?.source,
      rationale: b.disclosure?.rationale,
      recipient: b.request?.recipient,
      amount: b.request?.amount,
      country: b.request?.country,
      subject: b.reputation?.subject,
      tx: b.reputation?.txHash,
      explorer: b.reputation?.explorerUrl,
      blocks: b.capabilityBlocks.length,
      deny: b.capabilityBlocks.map(
        (c) => (c.output as { error?: string }).error,
      ),
    },
    distinctSubjects: a.reputation?.subject !== b.reputation?.subject,
    distinctTx:
      Boolean(a.reputation?.txHash) &&
      a.reputation?.txHash !== b.reputation?.txHash,
    readA: readA
      ? {
          attestedAt: readA.attestedAt.toString(),
          attester: readA.attester,
          piiFields: readA.piiFields,
        }
      : null,
    readB: readB
      ? {
          attestedAt: readB.attestedAt.toString(),
          attester: readB.attester,
          piiFields: readB.piiFields,
        }
      : null,
  };
  console.log(JSON.stringify(report, null, 2));

  if (
    !report.distinctSubjects ||
    !report.distinctTx ||
    !readA ||
    readA.attestedAt === 0n ||
    !readB ||
    readB.attestedAt === 0n ||
    a.capabilityBlocks.length < 2 ||
    b.capabilityBlocks.length < 2
  ) {
    process.exitCode = 1;
    throw new Error("two-traces failed: unique readable attestations required");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
