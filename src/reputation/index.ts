import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hex,
  encodeDeployData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { getExecutionPrivateKey } from "@/wallet/dual";

const RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
const ADDRESS_FILE = join(process.cwd(), ".data", "reputation-address.json");

export const reputationAbi = parseAbi([
  "function attest(bytes32 subject, bytes32 kind, bytes32 evidenceHash) returns (bytes32)",
  "function getAttestation(bytes32 subject) view returns (bytes32 kind, bytes32 evidenceHash, uint64 attestedAt, address attester)",
  "function subjectCount() view returns (uint256)",
  "event Attested(bytes32 indexed subject, bytes32 indexed kind, bytes32 evidenceHash, address attester, uint64 attestedAt)",
]);

/** Compiled with solc 0.8.20 — ReputationAttestation.sol (see scripts/compile-reputation.ts) */
export const REPUTATION_BYTECODE =
  process.env.REPUTATION_BYTECODE as Hex | undefined;

export type AttestationWrite = {
  txHash: Hex;
  explorerUrl: string;
  subject: Hex;
  kind: Hex;
  evidenceHash: Hex;
  contract: Address;
};

export type AttestationRead = {
  kind: Hex;
  evidenceHash: Hex;
  attestedAt: bigint;
  attester: Address;
  piiFields: string[];
};

function loadContractAddress(): Address | null {
  if (process.env.REPUTATION_CONTRACT) {
    return process.env.REPUTATION_CONTRACT as Address;
  }
  if (existsSync(ADDRESS_FILE)) {
    const j = JSON.parse(readFileSync(ADDRESS_FILE, "utf8")) as {
      address: Address;
    };
    return j.address;
  }
  return null;
}

export function saveContractAddress(address: Address) {
  mkdirSync(join(process.cwd(), ".data"), { recursive: true });
  writeFileSync(
    ADDRESS_FILE,
    JSON.stringify(
      { address, chain: "baseSepolia", deployedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
}

export async function deployReputationContract(
  bytecode: Hex,
): Promise<Address> {
  const account = privateKeyToAccount(getExecutionPrivateKey());
  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC),
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });

  const data = encodeDeployData({
    abi: reputationAbi,
    bytecode,
  });
  const hash = await wallet.sendTransaction({ data });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error("deploy failed — no contractAddress");
  }
  saveContractAddress(receipt.contractAddress);
  return receipt.contractAddress;
}

export async function writeAttestation(args: {
  subject: Hex;
  kind: Hex;
  evidenceHash: Hex;
}): Promise<AttestationWrite> {
  let address = loadContractAddress();
  if (!address) {
    const bc =
      REPUTATION_BYTECODE ??
      (existsSync(join(process.cwd(), ".data", "reputation-bytecode.txt"))
        ? (readFileSync(
            join(process.cwd(), ".data", "reputation-bytecode.txt"),
            "utf8",
          ).trim() as Hex)
        : null);
    if (!bc) {
      throw new Error(
        "No REPUTATION_CONTRACT — run: npx tsx scripts/deploy-reputation.ts",
      );
    }
    address = await deployReputationContract(bc);
  }

  const account = privateKeyToAccount(getExecutionPrivateKey());
  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC),
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });

  const txHash = await wallet.writeContract({
    address,
    abi: reputationAbi,
    functionName: "attest",
    args: [args.subject, args.kind, args.evidenceHash],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
    subject: args.subject,
    kind: args.kind,
    evidenceHash: args.evidenceHash,
    contract: address,
  };
}

export async function readAttestation(subject: Hex): Promise<AttestationRead> {
  const address = loadContractAddress();
  if (!address) throw new Error("REPUTATION_CONTRACT not set");
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
  const [kind, evidenceHash, attestedAt, attester] =
    await publicClient.readContract({
      address,
      abi: reputationAbi,
      functionName: "getAttestation",
      args: [subject],
    });
  return {
    kind,
    evidenceHash,
    attestedAt,
    attester,
    piiFields: [],
  };
}
