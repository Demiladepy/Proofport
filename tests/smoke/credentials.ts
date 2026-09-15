/**
 * Phase 1 gate: issue IdentityVC (5 claims), present only verified+country, verify.
 */
import {
  issue,
  present,
  verify,
} from "../../src/credentials/index";

async function main() {
  const issued = await issue("IdentityVC");
  console.log("issued.claimKeys:", issued.claimKeys);

  const { presentation, disclosed, withheld } = await present(issued.credential, [
    "verified",
    "country",
  ]);

  const verified = await verify(presentation, withheld);

  const output = {
    signatureValid: verified.signatureValid,
    disclosedClaims: verified.disclosedClaims,
    disclosedRequested: disclosed,
    withheldClaims: withheld,
    withheldCryptographicallyAbsent: verified.withheldAbsentFromPayload,
    allWithheldAbsent:
      withheld.length > 0 &&
      withheld.every((c) => verified.withheldAbsentFromPayload.includes(c)),
    payloadKeys: verified.payloadKeys,
  };

  console.log(JSON.stringify(output, null, 2));

  if (!output.signatureValid) {
    process.exitCode = 1;
    throw new Error("signature invalid");
  }
  const keys = Object.keys(output.disclosedClaims).sort();
  if (keys.join(",") !== "country,verified") {
    process.exitCode = 1;
    throw new Error(`expected disclosed {country, verified}, got ${keys.join(",")}`);
  }
  if (!output.allWithheldAbsent) {
    process.exitCode = 1;
    throw new Error("withheld claims still present in verified payload");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
