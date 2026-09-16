import { tool } from "ai";
import { z } from "zod";
import { executeSwap } from "@/swap";
import { payComplianceCheck } from "@/payments/x402";
import { requestPartnerHandoff } from "@/partner";
import { checkWallet } from "@/wallet";
import { assertDelegationActive } from "@/delegation";
import { CapabilityDeniedError } from "@/agents/capability";

const baseUrl = () =>
  process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000";

/**
 * Execution-agent tools — funds only. Never receives identity claim payloads.
 * Credential-read stubs hard-deny at the tool boundary.
 */
export const executionAgentTools = {
  swap: tool({
    description: "Convert crypto → USDC via SwapProvider.",
    inputSchema: z.object({
      amountIn: z.string().default("0.01"),
      fromToken: z.enum(["ETH", "WETH", "USDC"]).default("ETH"),
      toToken: z.enum(["ETH", "WETH", "USDC"]).default("USDC"),
    }),
    execute: async ({ amountIn, fromToken, toToken }) => {
      assertDelegationActive();
      return executeSwap({ amountIn, fromToken, toToken });
    },
  }),

  pay_x402: tool({
    description: "Pay compliance-check fee via x402 from execution wallet.",
    inputSchema: z.object({}),
    execute: async () => {
      assertDelegationActive();
      return payComplianceCheck(baseUrl());
    },
  }),

  request_handoff: tool({
    description:
      "Hand-off to mock licensed partner. Pass presentation string only (no claim dump). NO fiat.",
    inputSchema: z.object({
      presentation: z.string(),
      destinationBank: z.string().default("Zenith"),
      amountUsd: z.string().default("500"),
      /** Boolean from verifier — execution never sees underlying claims */
      proofVerified: z.boolean(),
    }),
    execute: async ({ presentation, destinationBank, amountUsd, proofVerified }) => {
      assertDelegationActive();
      if (!proofVerified) {
        return {
          status: "rejected" as const,
          reason: "verifier boolean false — execution-agent will not hand off",
        };
      }
      return requestPartnerHandoff({
        presentation,
        destinationBank,
        amountUsd,
      });
    },
  }),

  check_wallet: tool({
    description: "Check execution-agent wallet readiness.",
    inputSchema: z.object({}),
    execute: async () => checkWallet(),
  }),

  /** Intentional trap — must hard-deny */
  attempt_read_credential: tool({
    description:
      "FORBIDDEN for execution-agent. Used to demo capability separation.",
    inputSchema: z.object({
      claim: z.string().optional(),
    }),
    execute: async (): Promise<{ error: string }> => {
      throw new CapabilityDeniedError(
        "execution",
        "attempt_read_credential",
      );
    },
  }),
};

export type ExecutionAgentTools = typeof executionAgentTools;

export const EXECUTION_ALLOWED = new Set([
  "swap",
  "pay_x402",
  "request_handoff",
  "check_wallet",
  "attempt_read_credential",
]);
