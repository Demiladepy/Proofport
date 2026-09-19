import { createHash, randomUUID } from "node:crypto";
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
import { selectDisclosureClaims } from "@/agents/proof-agent/select-claims";

export type ToolCallTraceEntry = {
  toolName: string;
  agent: "proof" | "execution" | "orchestrator";
  input: unknown;
  output: unknown;
};

export type OrchestratorInput = {
  message: string;
  recipient?: string;
  amount?: string;
  country?: string;
};

export type OrchestratorResult = {
  mode: "deterministic" | "openai";
  text: string;
  toolCalls: ToolCallTraceEntry[];
  capabilityBlocks: ToolCallTraceEntry[];
  proofVerified: boolean;
  disclosure?: {
    claims: string[];
    rationale: string;
    source: "openai" | "fallback";
  };
  request?: {
    recipient: string;
    amount: string;
    country: string;
  };
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

type MpcStepResult =
  | {
      signer: "dynamic_mpc";
      live: true;
      from: string;
      txHash: string;
      explorerUrl: string;
    }
  | { signer: "local_viem"; live: false; note: string; lastMpcTx?: string };

/**
 * Ask the Dynamic MPC sidecar to sign a tiny self-transfer from the server
 * wallet. Never throws: if the Linux signer is not running we say so, and cite
 * the last proven MPC hash rather than implying this run produced one.
 */
async function signDynamicProofOfAuthority(): Promise<MpcStepResult> {
  const { probeMpcSigner, mpcSignAndSend, getMpcProof } = await import(
    "@/wallet/dynamic-mpc"
  );
  const proof = getMpcProof();
  const live = await probeMpcSigner();
  if (!live?.ready) {
    return {
      signer: "local_viem",
      live: false,
      note: "Dynamic MPC signer offline (npm run mpc:serve). This run signed with the local execution key.",
      lastMpcTx: proof?.txHash,
    };
  }
  try {
    const sent = await mpcSignAndSend();
    return {
      signer: "dynamic_mpc",
      live: true,
      from: sent.address,
      txHash: sent.txHash,
      explorerUrl: sent.explorerUrl,
    };
  } catch (err) {
    return {
      signer: "local_viem",
      live: false,
      note: `Dynamic MPC sign failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
      lastMpcTx: proof?.txHash,
    };
  }
}

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
  input: string | OrchestratorInput,
): Promise<OrchestratorResult> {
  assertDelegationActive();
  const req = typeof input === "string" ? { message: input } : input;
  const userMessage = req.message;
  const recipient = req.recipient?.trim() || "Zenith";
  const amount = req.amount?.trim() || "500";
  const country = req.country?.trim() || "NG";
  const requestMeta = { recipient, amount, country };

  const toolCalls: ToolCallTraceEntry[] = [];
  const capabilityBlocks: ToolCallTraceEntry[] = [];

  await ensureDemoCredentials();
  toolCalls.push({
    toolName: "get_credentials",
    agent: "proof",
    input: {},
    output: { held: { identity: true, provenance: true } },
  });

  const disclosure = await selectDisclosureClaims({
    message: userMessage,
    recipient,
    amount,
    country,
  });

  const held = await ensureDemoCredentials();
  const presented = await present(held.identity, disclosure.claims);
  const verified = await verify(presented.presentation, presented.withheld);
  const proofVerified =
    verified.signatureValid &&
    (verified.disclosedClaims.verified === true ||
      verified.disclosedClaims.verified === "true");

  toolCalls.push({
    toolName: "present_proof",
    agent: "proof",
    input: { claims: disclosure.claims, source: disclosure.source },
    output: {
      disclosed: presented.disclosed,
      withheld: presented.withheld,
      disclosedClaims: verified.disclosedClaims,
      presentation: presented.presentation,
      signatureValid: verified.signatureValid,
      verifiedOk: proofVerified,
      rationale: disclosure.rationale,
      source: disclosure.source,
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

  const swapAmount =
    process.env.UNISWAP_LIVE === "true" &&
    (process.env.SWAP_PROVIDER ?? "auto").toLowerCase() !== "mock"
      ? "0.0001"
      : "0.01";
  const swap = await executeSwap({
    amountIn: swapAmount,
    fromToken: "ETH",
    toToken: "USDC",
  });
  toolCalls.push({
    toolName: "swap",
    agent: "execution",
    input: { amountIn: swapAmount, fromToken: "ETH", toToken: "USDC" },
    output: swap,
  });

  // Delegated authority, exercised. When the Dynamic MPC signer is up, the
  // execution-agent proves the grant by making the *server wallet* sign a tx —
  // `from` is the MPC address, not our local key. Best-effort: a missing signer
  // is reported as unavailable rather than failing the run.
  const mpc = await signDynamicProofOfAuthority();
  toolCalls.push({
    toolName: "dynamic_mpc_sign",
    agent: "execution",
    input: { intent: "prove delegated authority with an MPC signature" },
    output: mpc,
  });

  // A wrong PROOFPORT_BASE_URL (e.g. localhost on a hosted deploy) makes this
  // fetch throw. That is a config fault, not a reason to kill the whole run.
  let pay: unknown;
  try {
    pay = await payComplianceCheck(
      process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000",
    );
  } catch (err) {
    pay = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      note: "x402 loop unreachable — check PROOFPORT_BASE_URL points at this deployment",
    };
  }
  toolCalls.push({
    toolName: "pay_x402",
    agent: "execution",
    input: {},
    output: pay,
  });

  const runId = randomUUID();
  const evidenceHash = (`0x` +
    createHash("sha256")
      .update(`verified:${proofVerified}|v=1|run:${runId}`)
      .digest("hex")) as `0x${string}`;
  const subject = (`0x` +
    createHash("sha256")
      .update(`proofport:subject:${runId}:${recipient}`)
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
      mode: disclosure.source === "openai" ? "openai" : "deterministic",
      text: `Proof failed for: ${userMessage}`,
      toolCalls,
      capabilityBlocks,
      proofVerified,
      disclosure,
      request: requestMeta,
      reputation,
      handoff,
    };
  }

  const handoff = await requestPartnerHandoff({
    presentation: presented.presentation,
    destinationBank: recipient,
    amountUsd: amount,
  });
  toolCalls.push({
    toolName: "request_handoff",
    agent: "execution",
    input: { proofVerified: true, destinationBank: recipient, amountUsd: amount },
    output: handoff,
  });

  return {
    mode: disclosure.source === "openai" ? "openai" : "deterministic",
    text: `Proofport cash-out for: ${userMessage}. To ${recipient} (${amount} USD, ${country}). Disclosed ${disclosure.claims.join("+")} (${disclosure.source}). Capability blocks: ${capabilityBlocks.length}. Handoff: ${handoff.status}. Reputation: ${reputation.txHash ? "onchain" : "pending"}.`,
    toolCalls,
    capabilityBlocks,
    proofVerified,
    disclosure,
    request: requestMeta,
    reputation,
    handoff,
  };
}

export async function runAgent(
  userMessage: string | OrchestratorInput,
): Promise<OrchestratorResult> {
  return runOrchestrator(userMessage);
}
