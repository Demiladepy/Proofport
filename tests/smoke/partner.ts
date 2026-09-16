import "dotenv/config";
import { createHash } from "node:crypto";
import type { Hex } from "viem";
import { grantDelegation } from "../../src/delegation";
import { runOrchestrator } from "../../src/orchestrator";
import { requestPartnerHandoff } from "../../src/partner";
import { readAttestation } from "../../src/reputation";
import { present, ensureDemoCredentials, verify } from "../../src/credentials";

async function main() {
  grantDelegation({ mode: "app_level_fallback" });
  process.env.SWAP_PROVIDER = process.env.SWAP_PROVIDER ?? "mock";

  const run = await runOrchestrator("cash out my reward to Zenith");
  const handoff = run.handoff as { status?: string } | undefined;
  const attCall = run.toolCalls.find((t) => t.toolName === "write_attestation");
  const attOut = attCall?.output as
    | { txHash?: string; error?: string; explorerUrl?: string }
    | undefined;

  let readBack: unknown = null;
  if (run.reputation?.subject && !attOut?.error) {
    try {
      const r = await readAttestation(run.reputation.subject as Hex);
      readBack = {
        kind: r.kind,
        evidenceHash: r.evidenceHash,
        attestedAt: r.attestedAt.toString(),
        attester: r.attester,
        piiFields: r.piiFields,
      };
    } catch (e) {
      readBack = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const held = await ensureDemoCredentials();
  const { presentation } = await present(held.identity!, ["verified", "country"]);
  const jwt = presentation.split("~")[0] ?? presentation;
  const jwtParts = jwt.split(".");
  const tamperedJwt =
    jwtParts.length >= 3
      ? `${jwtParts[0]}.${jwtParts[1]}.AAAA${jwtParts[2].slice(4)}`
      : `${jwt}tampered`;
  const tampered = [tamperedJwt, ...presentation.split("~").slice(1)].join("~");
  const bad = await requestPartnerHandoff({
    presentation: tampered,
    destinationBank: "Zenith",
    amountUsd: "500",
  });

  const sequence = run.toolCalls.map((t) => t.toolName);
  const hasAttestation = sequence.includes("write_attestation");
  const attBeforeHandoff =
    sequence.indexOf("write_attestation") >= 0 &&
    sequence.indexOf("request_handoff") > sequence.indexOf("write_attestation");

  const report = {
    pipeline: {
      proofVerified: run.proofVerified,
      capabilityBlocks: run.capabilityBlocks.length,
      sequence,
      handoffStatus: handoff?.status,
      attestation: attOut,
      readBack,
      hasAttestation,
      attBeforeHandoff,
    },
    rejection: bad,
    verifiedDisclosure: await verify(presentation, [
      "over_18",
      "full_name",
      "id_number",
    ]),
    evidenceHashIsNotPii: (() => {
      const h =
        run.reputation?.evidenceHash ??
        (`0x` +
          createHash("sha256")
            .update(`verified:${run.proofVerified}|v=1`)
            .digest("hex"));
      return !/Ada|Okonkwo|NIN-|full_name/i.test(h);
    })(),
  };

  console.log(JSON.stringify(report, null, 2));

  if (
    handoff?.status !== "settlement_initiated" ||
    bad.status !== "rejected" ||
    !run.proofVerified ||
    !hasAttestation ||
    !attBeforeHandoff ||
    attOut?.error
  ) {
    process.exitCode = 1;
    throw new Error("Phase 7 gate failed — pipeline or attestation");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
