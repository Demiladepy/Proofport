import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const ALLOWED = ["verified", "country", "over_18"] as const;
const FORBIDDEN = new Set(["full_name", "id_number"]);

export type ClaimSelection = {
  claims: string[];
  rationale: string;
  source: "openai" | "fallback";
};

function sanitize(raw: string[]): string[] {
  const picked = raw
    .map((c) => c.trim().toLowerCase())
    .filter((c) => (ALLOWED as readonly string[]).includes(c))
    .filter((c) => !FORBIDDEN.has(c));
  const unique = [...new Set(picked)];
  if (!unique.includes("verified")) unique.unshift("verified");
  return unique.length ? unique : ["verified", "country"];
}

function fallback(reason: string): ClaimSelection {
  return {
    claims: ["verified", "country"],
    rationale: reason,
    source: "fallback",
  };
}

/**
 * One proof-agent decision: minimal allowlisted claims for this request.
 * Execution stays code-enforced. Never discloses name/ID.
 */
export async function selectDisclosureClaims(args: {
  message: string;
  recipient: string;
  amount: string;
  country: string;
}): Promise<ClaimSelection> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return fallback("OpenAI unavailable. Fallback: verified + country.");
  }

  try {
    const openai = createOpenAI({ apiKey: key });
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      maxOutputTokens: 180,
      prompt: `You pick the MINIMAL identity claims to disclose for a cash-out / proof request.
Allowed claims only: verified, country, over_18.
Forbidden: full_name, id_number, anything else.
Always include verified.
If the user is sending money to a bank or names a country, include country.
If the user mentions age, 18+, or age-gated payout, include over_18 and you MAY omit country.
Reply with JSON only: {"claims":["verified","country"],"rationale":"one sentence"}

Request: ${args.message}
Recipient: ${args.recipient}
Amount USD: ${args.amount}
Country field: ${args.country}`,
    });

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) {
      return fallback("Model returned non-JSON. Fallback: verified + country.");
    }
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      claims?: unknown;
      rationale?: unknown;
    };
    const claims = sanitize(
      Array.isArray(parsed.claims) ? parsed.claims.map(String) : [],
    );
    const rationale =
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : "Minimal claims for this request.";
    return { claims, rationale, source: "openai" };
  } catch (err) {
    return fallback(
      `OpenAI failed (${err instanceof Error ? err.message : "error"}). Fallback: verified + country.`,
    );
  }
}
