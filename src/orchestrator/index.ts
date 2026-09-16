import { createHash } from "node:crypto";
import {
  ensureDemoCredentials,
  present,
  verify,
} from "@/credentials";
import { assertDelegationActive } from "@/delegation";
import { executeSwap } from "@/swap";
import { payComplianceCheck } from "@/payments/x402";
import { requestPartnerHandoff } from "@/partner";
import { CapabilityDeniedError, denyCapability } from "@/agents/capability";
import { writeAttestation } from "@/reputation";

export type ToolCallTraceEntry = {
  toolName: string;
  agent: "proof" | "execution" | "orchestrator";
  input: unknown;
  output: unknown;
};

export type OrchestratorResult = {
  mode: "deterministic" | "openai";
  text: string;
  toolCalls: ToolCallTraceEntry[];
  capabilityBlocks: ToolCallTraceEntry[];
  proofVerified: boolean;
  reputation?: {
    txHash?: string;
    explorerUrl?: string;
    subject?: string;
    kind?: string;
    evidenceHash?: string;
    piiFields: string[];
  };
  handoff?: unknown;
};

function captureDeny(
  agent: "proof" | "execution",
  toolName: string,
  input: unknown,
  fn: () => never,
): ToolCallTraceEntry {
  try {
    fn();
  } catch (err) {
    if (err instanceof CapabilityDeniedError) {
      return {
        toolName,
        agent,
        input,
        output: {
          error: err.message,
          code: err.code,
          attemptedTool: err.attemptedTool,
        },
      };
    }
    throw err;
  }
  throw new Error("expected capability denial");
}

/**
 * Two-agent cash-out orchestrator:
 * proof presents → capability demos → execution (boolean only) → swap → x402 → attestation → handoff
 */
export async function runOrchestrator(
  userMessage: string,
): Promise<OrchestratorResult> {
  assertDelegationActive();
  const toolCalls: ToolCallTraceEntry[] = [];
  const capabilityBlocks: ToolCallTraceEntry[] = [];

  await ensureDemoCredentials();
  toolCalls.push({
    toolName: "get_credentials",
    agent: "proof",
    input: {},
    output: { held: { identity: true, provenance: true } },
  });

  const held = await ensureDemoCredentials();
  const presented = await present(held.identity, ["verified", "country"]);
  const verified = await verify(presented.presentation, presented.withheld);
  const proofVerified =
    verified.signatureValid &&
    (verified.disclosedClaims.verified === true ||
      verified.disclosedClaims.verified === "true");

  toolCalls.push({
    toolName: "present_proof",
    agent: "proof",
    input: { claims: ["verified", "country"] },
    output: {
      disclosed: presented.disclosed,
      withheld: presented.withheld,
      disclosedClaims: verified.disclosedClaims,
      presentation: presented.presentation,
      signatureValid: verified.signatureValid,
      verifiedOk: proofVerified,
    },
  });

  const denySwap = captureDeny("proof", "attempt_swap", { amountIn: "0.01" }, () =>
    denyCapability("proof", "attempt_swap"),
  );
  capabilityBlocks.push(denySwap);
  toolCalls.push(denySwap);

  const denyRead = captureDeny(
    "execution",
    "attempt_read_credential",
    { claim: "full_name" },
    () => denyCapability("execution", "attempt_read_credential"),
  );
  capabilityBlocks.push(denyRead);
  toolCalls.push(denyRead);

  const swap = await executeSwap({
    amountIn: "0.01",
    fromToken: "ETH",
    toToken: "USDC",
  });
  toolCalls.push({
    toolName: "swap",
    agent: "execution",
    input: { amountIn: "0.01", fromToken: "ETH", toToken: "USDC" },
    output: swap,
  });

  const pay = await payComplianceCheck(
    process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000",
  );
  toolCalls.push({
    toolName: "pay_x402",
    agent: "execution",
    input: {},
    output: pay,
  });

  const evidenceHash = (`0x` +
    createHash("sha256")
      .update(`verified:${proofVerified}|v=1`)
      .digest("hex")) as `0x${string}`;
  const subject = (`0x` +
    createHash("sha256")
      .update("proofport:subject:demo-user")
      .digest("hex")) as `0x${string}`;
  const kind = (`0x` +
    createHash("sha256")
      .update("proofport:kind:cashout_verified")
      .digest("hex")) as `0x${string}`;

  let reputation: OrchestratorResult["reputation"] = {
    piiFields: [],
    subject,
    kind,
    evidenceHash,
  };

  if (proofVerified) {
    try {
      const att = await writeAttestation({ subject, kind, evidenceHash });
      reputation = {
        ...reputation,
        txHash: att.txHash,
        explorerUrl: att.explorerUrl,
        piiFields: [],
      };
      toolCalls.push({
        toolName: "write_attestation",
        agent: "orchestrator",
        input: { subject, kind, evidenceHash, note: "no PII" },
        output: att,
      });
    } catch (err) {
      toolCalls.push({
        toolName: "write_attestation",
        agent: "orchestrator",
        input: { subject, kind, evidenceHash },
        output: {
          error: err instanceof Error ? err.message : String(err),
          note: "attestation skipped — deploy contract or set REPUTATION_CONTRACT",
        },
      });
    }
  }

  if (!proofVerified) {
    const handoff = {
      status: "rejected" as const,
      reason: "verifier boolean false",
    };
    toolCalls.push({
      toolName: "request_handoff",
      agent: "execution",
      input: { proofVerified },
      output: handoff,
    });
    return {
      mode: "deterministic",
      text: `Proof failed for: ${userMessage}`,
      toolCalls,
      capabilityBlocks,
      proofVerified,
      reputation,
      handoff,
    };
  }

  const handoff = await requestPartnerHandoff({
    presentation: presented.presentation,
    destinationBank: "Zenith",
    amountUsd: "500",
  });
  toolCalls.push({
    toolName: "request_handoff",
    agent: "execution",
    input: { proofVerified: true, destinationBank: "Zenith" },
    output: handoff,
  });

  return {
    mode: "deterministic",
    text: `Proofport cash-out for: ${userMessage}. Proof-agent disclosed verified+country only. Capability blocks: ${capabilityBlocks.length}. Handoff: ${handoff.status}. Reputation: ${reputation.txHash ? "onchain" : "pending"}.`,
    toolCalls,
    capabilityBlocks,
    proofVerified,
    reputation,
    handoff,
  };
}

export async function runAgent(userMessage: string): Promise<OrchestratorResult> {
  return runOrchestrator(userMessage);
}
