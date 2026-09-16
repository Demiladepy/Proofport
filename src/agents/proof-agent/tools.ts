import { tool } from "ai";
import { z } from "zod";
import {
  ensureDemoCredentials,
  present,
  verify,
  getHeldCredentials,
} from "@/credentials";
import { loadDelegation, assertDelegationActive } from "@/delegation";
import { CapabilityDeniedError } from "@/agents/capability";

/**
 * Proof-agent tools — credentials only. Fund tools are registered as
 * intentional denial stubs for the capability-block demo/smoke.
 */
export const proofAgentTools = {
  get_credentials: tool({
    description:
      "Load or issue held IdentityVC + ProvenanceVC (mock issuer).",
    inputSchema: z.object({}),
    execute: async () => {
      assertDelegationActive();
      const creds = await ensureDemoCredentials();
      return {
        held: {
          identity: Boolean(creds.identity),
          provenance: Boolean(creds.provenance),
        },
      };
    },
  }),

  present_proof: tool({
    description:
      "Selectively disclose listed claims. Cash-out: verified + country only.",
    inputSchema: z.object({
      claims: z.array(z.string()),
      credential: z.enum(["identity", "provenance"]).default("identity"),
    }),
    execute: async ({ claims, credential }) => {
      assertDelegationActive();
      const held = getHeldCredentials();
      const pair = held.identity ? held : await ensureDemoCredentials();
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
        verifiedOk:
          verified.signatureValid &&
          (verified.disclosedClaims.verified === true ||
            verified.disclosedClaims.verified === "true"),
      };
    },
  }),

  check_delegation: tool({
    description: "Check whether user still grants authority.",
    inputSchema: z.object({}),
    execute: async () => loadDelegation(),
  }),

  /** Intentional trap — must hard-deny */
  attempt_swap: tool({
    description: "FORBIDDEN for proof-agent. Used to demo capability separation.",
    inputSchema: z.object({
      amountIn: z.string().optional(),
    }),
    execute: async (): Promise<{ error: string }> => {
      throw new CapabilityDeniedError("proof", "attempt_swap");
    },
  }),

  attempt_transfer: tool({
    description: "FORBIDDEN for proof-agent. Used to demo capability separation.",
    inputSchema: z.object({
      to: z.string().optional(),
    }),
    execute: async (): Promise<{ error: string }> => {
      throw new CapabilityDeniedError("proof", "attempt_transfer");
    },
  }),
};

export type ProofAgentTools = typeof proofAgentTools;

export const PROOF_ALLOWED = new Set([
  "get_credentials",
  "present_proof",
  "check_delegation",
  "attempt_swap",
  "attempt_transfer",
]);

export const PROOF_FUND_TOOLS = new Set(["attempt_swap", "attempt_transfer"]);
