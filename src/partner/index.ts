import {
  ensureDemoCredentials,
  getHeldCredentials,
  present,
  verify,
  type CredentialKind,
} from "@/credentials";

export type HandoffRequest = {
  presentation: string;
  destinationBank: string;
  amountUsd: string;
};

export type HandoffResult =
  | {
      status: "settlement_initiated";
      partner: string;
      reference: string;
      verifiedClaims: Record<string, unknown>;
      note: string;
    }
  | {
      status: "rejected";
      reason: string;
    };

/**
 * Mock licensed-partner boundary. Re-verifies SD-JWT. NO fiat moves.
 */
export async function requestPartnerHandoff(
  req: HandoffRequest,
): Promise<HandoffResult> {
  try {
    const verified = await verify(req.presentation);
    if (!verified.signatureValid) {
      return { status: "rejected", reason: "proof signature invalid" };
    }
    const claims = verified.disclosedClaims;
    if (claims.verified !== true && claims.verified !== "true") {
      return {
        status: "rejected",
        reason: "missing or false verified claim",
      };
    }
    return {
      status: "settlement_initiated",
      partner: "MockLicensedPartner",
      reference: `MLP-${Date.now()}`,
      verifiedClaims: claims,
      note: "NO fiat moved. Regulated transfer would begin at partner. See MOCKS.md.",
    };
  } catch (err) {
    return {
      status: "rejected",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getOrIssueCredentials() {
  return ensureDemoCredentials();
}

export async function presentMinimalIdentityProof(
  claims: string[] = ["verified", "country"],
) {
  const held = getHeldCredentials();
  const { identity } = held.identity
    ? { identity: held.identity }
    : await ensureDemoCredentials();
  return present(identity, claims);
}

export type { CredentialKind };
