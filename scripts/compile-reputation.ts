/**
 * Compile ReputationAttestation.sol with solc and write bytecode to .data/
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import solc from "solc";

const source = readFileSync(
  join(process.cwd(), "contracts", "ReputationAttestation.sol"),
  "utf8",
);

const input = {
  language: "Solidity",
  sources: {
    "ReputationAttestation.sol": { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input))) as {
  errors?: Array<{ severity: string; formattedMessage: string }>;
  contracts: {
    "ReputationAttestation.sol": {
      ReputationAttestation: {
        abi: unknown;
        evm: { bytecode: { object: string } };
      };
    };
  };
};

if (out.errors?.some((e) => e.severity === "error")) {
  console.error(out.errors.map((e) => e.formattedMessage).join("\n"));
  process.exit(1);
}

const artifact = out.contracts["ReputationAttestation.sol"].ReputationAttestation;
const bytecode = ("0x" + artifact.evm.bytecode.object) as `0x${string}`;

mkdirSync(join(process.cwd(), ".data"), { recursive: true });
writeFileSync(join(process.cwd(), ".data", "reputation-bytecode.txt"), bytecode);
writeFileSync(
  join(process.cwd(), ".data", "reputation-abi.json"),
  JSON.stringify(artifact.abi, null, 2),
);
console.log(
  JSON.stringify(
    {
      ok: true,
      bytecodeBytes: (bytecode.length - 2) / 2,
      path: ".data/reputation-bytecode.txt",
    },
    null,
    2,
  ),
);
