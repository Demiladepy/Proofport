import "dotenv/config";
import { runAgent } from "../../src/agent";
import { grantDelegation } from "../../src/delegation";

async function main() {
  grantDelegation({ mode: "app_level_fallback" });
  process.env.SWAP_PROVIDER = process.env.SWAP_PROVIDER ?? "mock";

  const input = "cash out my reward to Zenith";
  const result = await runAgent(input);

  const present = result.toolCalls.find((t) => t.toolName === "present_proof");
  const names = result.toolCalls.map((t) => t.toolName);

  const presentOut = present?.output as
    | { disclosed?: string[]; withheld?: string[] }
    | undefined;

  const report = {
    input,
    mode: result.mode,
    toolSequence: names,
    capabilityBlocks: result.capabilityBlocks.length,
    present_proof: present
      ? {
          input: present.input,
          disclosed: presentOut?.disclosed,
          withheld: presentOut?.withheld,
        }
      : null,
    hasSwap: names.includes("swap"),
    hasPay: names.includes("pay_x402"),
    hasAttestation: names.includes("write_attestation"),
    hasHandoff: names.includes("request_handoff"),
    minimalDisclosure:
      Array.isArray(presentOut?.disclosed) &&
      presentOut!.disclosed!.every((c) => ["verified", "country"].includes(c)) &&
      !presentOut!.disclosed!.includes("full_name") &&
      !presentOut!.disclosed!.includes("id_number"),
    finalText: result.text,
  };

  console.log(JSON.stringify(report, null, 2));

  const orderOk =
    names.indexOf("present_proof") >= 0 &&
    names.indexOf("swap") > names.indexOf("present_proof") &&
    names.indexOf("pay_x402") > names.indexOf("swap") &&
    names.indexOf("request_handoff") > names.indexOf("pay_x402");

  if (
    !report.minimalDisclosure ||
    !orderOk ||
    result.capabilityBlocks.length < 2
  ) {
    process.exitCode = 1;
    throw new Error("Agent smoke failed: disclosure, sequence, or capability");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
