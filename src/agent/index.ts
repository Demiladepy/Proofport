import { generateText, isStepCount, tool, ToolLoopAgent } from "ai";
import { openai } from "@ai-sdk/openai";
import { proofportTools } from "./tools";
import { SYSTEM_PROMPT } from "./prompt";
import {
  ensureDemoCredentials,
  present,
  verify,
} from "@/credentials";
import { executeSwap } from "@/swap";
import { payComplianceCheck } from "@/payments/x402";
import { requestPartnerHandoff } from "@/partner";
import { assertDelegationActive, loadDelegation } from "@/delegation";
import { checkWallet } from "@/wallet";

export type ToolCallTraceEntry = {
  toolName: string;
  input: unknown;
  output: unknown;
};

export type AgentRunResult = {
  mode: "openai" | "deterministic";
  text: string;
  toolCalls: ToolCallTraceEntry[];
};

/**
 * Deterministic demo planner — same tools as the LLM agent, fixed minimal plan.
 * Used when OPENAI_API_KEY is absent so Phase 2 gate still proves real present_proof.
 */
export async function runDeterministicCashOut(
  userMessage: string,
): Promise<AgentRunResult> {
  assertDelegationActive();
  const toolCalls: ToolCallTraceEntry[] = [];

  const creds = await ensureDemoCredentials();
  toolCalls.push({
    toolName: "get_credentials",
    input: {},
    output: { held: { identity: true, provenance: true } },
  });

  const presented = await present(creds.identity, ["verified", "country"]);
  const verified = await verify(presented.presentation, presented.withheld);
  toolCalls.push({
    toolName: "present_proof",
    input: { claims: ["verified", "country"], credential: "identity" },
    output: {
      disclosed: presented.disclosed,
      withheld: presented.withheld,
      disclosedClaims: verified.disclosedClaims,
      presentation: presented.presentation,
      signatureValid: verified.signatureValid,
    },
  });

  const swap = await executeSwap({
    amountIn: "0.01",
    fromToken: "ETH",
    toToken: "USDC",
  });
  toolCalls.push({
    toolName: "swap",
    input: { amountIn: "0.01", fromToken: "ETH", toToken: "USDC" },
    output: swap,
  });

  const pay = await payComplianceCheck(
    process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000",
  );
  toolCalls.push({ toolName: "pay_x402", input: {}, output: pay });

  const handoff = await requestPartnerHandoff({
    presentation: presented.presentation,
    destinationBank: "Zenith",
    amountUsd: "500",
  });
  toolCalls.push({
    toolName: "request_handoff",
    input: {
      destinationBank: "Zenith",
      amountUsd: "500",
      presentation: "[sd-jwt]",
    },
    output: handoff,
  });

  return {
    mode: "deterministic",
    text: `Cash-out plan for: ${userMessage}. Proof disclosed verified+country only. Handoff: ${handoff.status}.`,
    toolCalls,
  };
}

export async function runAgent(userMessage: string): Promise<AgentRunResult> {
  if (!process.env.OPENAI_API_KEY) {
    return runDeterministicCashOut(userMessage);
  }

  const toolCalls: ToolCallTraceEntry[] = [];

  const agent = new ToolLoopAgent({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    instructions: SYSTEM_PROMPT,
    tools: proofportTools,
    stopWhen: isStepCount(12),
  });

  const result = await agent.generate({
    prompt: userMessage,
  });

  // Extract tool results from steps when available
  const steps = (result as { steps?: Array<{ toolCalls?: unknown[]; toolResults?: Array<{ toolName: string; input?: unknown; output?: unknown }> }> }).steps ?? [];
  for (const step of steps) {
    for (const tr of step.toolResults ?? []) {
      toolCalls.push({
        toolName: tr.toolName,
        input: tr.input,
        output: tr.output,
      });
    }
  }

  return {
    mode: "openai",
    text: result.text ?? "",
    toolCalls,
  };
}

export { proofportTools, tool, generateText, loadDelegation, checkWallet };
