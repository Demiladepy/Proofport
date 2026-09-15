import "dotenv/config";
import {
  issue,
  present,
  verify,
} from "../../src/credentials";
import { requestPartnerHandoff } from "../../src/partner";
import { executeSwap } from "../../src/swap";
import { payComplianceCheck } from "../../src/payments/x402";
import { grantDelegation } from "../../src/delegation";

async function main() {
  grantDelegation({ mode: "app_level_fallback" });
  process.env.SWAP_PROVIDER = process.env.SWAP_PROVIDER ?? "mock";

  const issued = await issue("IdentityVC");
  const { presentation } = await present(issued.credential, [
    "verified",
    "country",
  ]);
  const swap = await executeSwap({
    amountIn: "0.01",
    fromToken: "ETH",
    toToken: "USDC",
  });
  const pay = await payComplianceCheck(
    process.env.PROOFPORT_BASE_URL ?? "http://localhost:3000",
  );
  const ok = await requestPartnerHandoff({
    presentation,
    destinationBank: "Zenith",
    amountUsd: "500",
  });

  // Tamper: corrupt JWT signature segment
  const jwt = presentation.split("~")[0] ?? presentation;
  const jwtParts = jwt.split(".");
  const tamperedJwt =
    jwtParts.length >= 3
      ? `${jwtParts[0]}.${jwtParts[1]}.AAAA${jwtParts[2].slice(4)}`
      : `${jwt}tampered`;
  const tampered = [tamperedJwt, ...presentation.split("~").slice(1)].join("~");
  const bad = await requestPartnerHandoff({
    presentation: tampered,
    destinationBank: "Zenith",
    amountUsd: "500",
  });

  const report = {
    success: ok,
    rejection: bad,
    swap,
    pay,
    verified: await verify(presentation, ["over_18", "full_name", "id_number"]),
  };
  console.log(JSON.stringify(report, null, 2));

  if (ok.status !== "settlement_initiated" || bad.status !== "rejected") {
    process.exitCode = 1;
    throw new Error("Phase 6 gate failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
