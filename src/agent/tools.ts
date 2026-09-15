import { tool } from "ai";
import { z } from "zod";
import {
  ensureDemoCredentials,
  present,
  verify,
  getHeldCredentials,
} from "@/credentials";
import { executeSwap } from "@/swap";
import { payComplianceCheck } from "@/payments/x402";
import { requestPartnerHandoff } from "@/partner";
import { checkWallet } from "@/wallet";
import { loadDelegation, assertDelegationActive } from "@/delegation";

const baseUrl = () =>
  process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000";

export const proofportTools = {
  get_credentials: tool({
    description:
      "Load or issue held IdentityVC + ProvenanceVC for the user (mock issuer).",
    inputSchema: z.object({}),
    execute: async () => {
      assertDelegationActive();
      const creds = await ensureDemoCredentials();
      return {
        held: {
          identity: Boolean(creds.identity),
          provenance: Boolean(creds.provenance),
        },
        identityPreview: "IdentityVC held (claims selectively disclosable)",
        provenancePreview: "ProvenanceVC held",
      };
    },
  }),

  present_proof: tool({
    description:
      "Selectively disclose only the listed claims from IdentityVC (and optionally ProvenanceVC). Use minimal claims: verified + country for cash-out.",
    inputSchema: z.object({
      claims: z
        .array(z.string())
        .describe('e.g. ["verified","country"] — never include full_name/id_number for this flow'),
      credential: z
        .enum(["identity", "provenance"])
        .default("identity")
        .describe("Which credential to present from"),
    }),
    execute: async ({ claims, credential }) => {
      assertDelegationActive();
      const held = getHeldCredentials();
      const pair = held.identity
        ? held
        : await ensureDemoCredentials();
      const token =
        credential === "provenance" ? pair.provenance! : pair.identity!;
      const presented = await present(token, claims);
      const verified = await verify(presented.presentation, presented.withheld);
      return {
        disclosed: presented.disclosed,
        withheld: presented.withheld,
        disclosedClaims: verified.disclosedClaims,
        presentation: presented.presentation,
        signatureValid: verified.signatureValid,
      };
    },
  }),

  swap: tool({
    description: "Convert crypto to USDC via SwapProvider (Uniswap or mock fallback).",
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
    description:
      "Agent pays its own compliance-check fee via x402 from the agent wallet.",
    inputSchema: z.object({}),
    execute: async () => {
      assertDelegationActive();
      return payComplianceCheck(baseUrl());
    },
  }),

  request_handoff: tool({
    description:
      "Authorized hand-off to mock licensed partner with SD-JWT presentation. NO fiat.",
    inputSchema: z.object({
      presentation: z.string().describe("SD-JWT presentation compact string"),
      destinationBank: z.string().default("Zenith"),
      amountUsd: z.string().default("500"),
    }),
    execute: async (input) => {
      assertDelegationActive();
      return requestPartnerHandoff(input);
    },
  }),

  check_wallet: tool({
    description: "Check agent Dynamic wallet readiness / address.",
    inputSchema: z.object({}),
    execute: async () => checkWallet(),
  }),

  check_delegation: tool({
    description: "Check whether user still grants the agent authority.",
    inputSchema: z.object({}),
    execute: async () => loadDelegation(),
  }),
};

export type ProofportTools = typeof proofportTools;
