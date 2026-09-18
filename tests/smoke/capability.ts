import "dotenv/config";
import { CapabilityDeniedError, denyCapability } from "../../src/agents/capability";
import { runOrchestrator } from "../../src/orchestrator";
import { grantDelegation } from "../../src/delegation";

async function main() {
  grantDelegation({ mode: "app_level_fallback" });
  process.env.SWAP_PROVIDER = "mock";
  process.env.UNISWAP_LIVE = "false";

  let proofDenied = false;
  let proofMsg = "";
  try {
    denyCapability("proof", "attempt_swap");
  } catch (e) {
    if (e instanceof CapabilityDeniedError) {
      proofDenied = true;
      proofMsg = e.message;
    }
  }

  let execDenied = false;
  let execMsg = "";
  try {
    denyCapability("execution", "attempt_read_credential");
  } catch (e) {
    if (e instanceof CapabilityDeniedError) {
      execDenied = true;
      execMsg = e.message;
    }
  }

  const run = await runOrchestrator("cash out my reward to Zenith");
  const agents = {
    proofTools: run.toolCalls
      .filter((t) => t.agent === "proof")
      .map((t) => t.toolName),
    executionTools: run.toolCalls
      .filter((t) => t.agent === "execution")
      .map((t) => t.toolName),
  };

  const report = {
    proofAgentDeniedFundAction: {
      ok: proofDenied,
      message: proofMsg,
    },
    executionAgentDeniedCredentialRead: {
      ok: execDenied,
      message: execMsg,
    },
    orchestratorCapabilityBlocks: run.capabilityBlocks,
    validRoute: {
      toolSequence: run.toolCalls.map((t) => `${t.agent}:${t.toolName}`),
      agents,
      proofVerified: run.proofVerified,
      handoff: (run.handoff as { status?: string })?.status,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  if (
    !proofDenied ||
    !execDenied ||
    run.capabilityBlocks.length < 2 ||
    !run.proofVerified
  ) {
    process.exitCode = 1;
    throw new Error("Phase 2 capability gate failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
