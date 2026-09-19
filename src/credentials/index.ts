import Crypto from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DisclosureFrame, PresentationFrame, Signer, Verifier } from "@sd-jwt/core";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";

export const ISSUER_DID = "did:proofport:mock-nin-bvn-authority";

export type IdentityClaims = {
  verified: boolean;
  country: string;
  over_18: boolean;
  full_name: string;
  id_number: string;
};

export type ProvenanceClaims = {
  source_wallet: string;
  source_label: string;
  clean: boolean;
  amount: string;
};

export type CredentialKind = "IdentityVC" | "ProvenanceVC";

const DATA_DIR = join(process.cwd(), ".data");
const KEY_PATH = join(DATA_DIR, "issuer-ed25519.json");

export type IssuerKeypair = {
  publicKeyPem: string;
  privateKeyPem: string;
};

function ensureDir(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

/** Survives a read-only filesystem (Vercel): keys stay in memory for the process. */
let memoryIssuerKeys: IssuerKeypair | null = null;

export function loadOrCreateIssuerKeys(): IssuerKeypair {
  if (memoryIssuerKeys) return memoryIssuerKeys;
  if (existsSync(KEY_PATH)) {
    return JSON.parse(readFileSync(KEY_PATH, "utf8")) as IssuerKeypair;
  }
  const { publicKey, privateKey } = Crypto.generateKeyPairSync("ed25519");
  const pair: IssuerKeypair = {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
  memoryIssuerKeys = pair;
  try {
    ensureDir(KEY_PATH);
    writeFileSync(KEY_PATH, JSON.stringify(pair, null, 2));
  } catch {
    // Vercel and other read-only filesystems: the demo issuer is ephemeral.
    // Presentations still verify within a process; nothing on-chain depends on it.
  }
  return pair;
}

const hasher = async (data: string | ArrayBuffer): Promise<Uint8Array> => {
  const buf =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  return new Uint8Array(Crypto.createHash("sha256").update(buf).digest());
};

const saltGenerator = (length: number): string =>
  Crypto.randomBytes(length).toString("base64url");

function createSignerVerifier(keys: IssuerKeypair): {
  signer: Signer;
  verifier: Verifier;
} {
  const privateKey = Crypto.createPrivateKey(keys.privateKeyPem);
  const publicKey = Crypto.createPublicKey(keys.publicKeyPem);
  const signer: Signer = async (data: string) => {
    const sig = Crypto.sign(null, Buffer.from(data), privateKey);
    return Buffer.from(sig).toString("base64url");
  };
  const verifier: Verifier = async (data: string, sig: string) => {
    return Crypto.verify(
      null,
      Buffer.from(data),
      publicKey,
      Buffer.from(sig, "base64url"),
    );
  };
  return { signer, verifier };
}

export function createSdJwtVc(keys = loadOrCreateIssuerKeys()): SDJwtVcInstance {
  const { signer, verifier } = createSignerVerifier(keys);
  return new SDJwtVcInstance({
    signer,
    signAlg: "EdDSA",
    verifier,
    hasher,
    hashAlg: "sha-256",
    saltGenerator,
  });
}

const DEFAULT_IDENTITY: IdentityClaims = {
  verified: true,
  country: "NG",
  over_18: true,
  full_name: "Bola Adeyemi",
  id_number: "NIN-12345678901",
};

const DEFAULT_PROVENANCE: ProvenanceClaims = {
  source_wallet: "0xRewardEscrowDemo",
  source_label: "hackathon_reward",
  clean: true,
  amount: "500",
};

export async function issue(
  kind: CredentialKind,
  claims?: Partial<IdentityClaims> | Partial<ProvenanceClaims>,
): Promise<{ credential: string; kind: CredentialKind; claimKeys: string[] }> {
  const sdjwt = createSdJwtVc();
  const iat = Math.floor(Date.now() / 1000);

  if (kind === "IdentityVC") {
    const full: IdentityClaims = { ...DEFAULT_IDENTITY, ...(claims as Partial<IdentityClaims>) };
    const claimKeys = [
      "verified",
      "country",
      "over_18",
      "full_name",
      "id_number",
    ] as const;
    const disclosureFrame = {
      _sd: [...claimKeys],
    };
    const credential = await sdjwt.issue(
      { iss: ISSUER_DID, iat, vct: "IdentityVC", ...full },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      disclosureFrame as any,
    );
    return { credential, kind, claimKeys: [...claimKeys] };
  }

  const full: ProvenanceClaims = { ...DEFAULT_PROVENANCE, ...(claims as Partial<ProvenanceClaims>) };
  const claimKeys = [
    "source_wallet",
    "source_label",
    "clean",
    "amount",
  ] as const;
  const disclosureFrame = {
    _sd: [...claimKeys],
  };
  const credential = await sdjwt.issue(
    { iss: ISSUER_DID, iat, vct: "ProvenanceVC", ...full },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disclosureFrame as any,
  );
  return { credential, kind, claimKeys: [...claimKeys] };
}

export async function present(
  credential: string,
  claimsToDisclose: string[],
): Promise<{ presentation: string; disclosed: string[]; withheld: string[] }> {
  const sdjwt = createSdJwtVc();
  const decoded = await sdjwt.decode(credential);
  const payload = (decoded.jwt?.payload ?? {}) as Record<string, unknown>;
  const allSelective = Object.keys(payload).filter(
    (k) => !["iss", "iat", "vct", "cnf", "status", "_sd", "_sd_alg"].includes(k),
  );

  // When claims are selectively disclosed, they appear only as digests in payload;
  // recover claim names from disclosures on the credential.
  const disclosureNames = (decoded.disclosures ?? [])
    .map((d) => {
      // Disclosure shape: [salt, name, value] or list form
      const arr = d as unknown as { key?: string; value?: unknown };
      if (arr && typeof arr === "object" && "key" in arr && arr.key) return String(arr.key);
      return null;
    })
    .filter(Boolean) as string[];

  const knownClaims = disclosureNames.length > 0 ? disclosureNames : allSelective;
  const withheld = knownClaims.filter((c) => !claimsToDisclose.includes(c));

  const presentationFrame = Object.fromEntries(
    claimsToDisclose.map((c) => [c, true]),
  ) as PresentationFrame<Record<string, unknown>>;

  const presentation = await sdjwt.present(credential, presentationFrame);
  return { presentation, disclosed: claimsToDisclose, withheld };
}

export type VerifyResult = {
  signatureValid: boolean;
  disclosedClaims: Record<string, unknown>;
  withheldAbsentFromPayload: string[];
  payloadKeys: string[];
};

export async function verify(
  presentation: string,
  expectedWithheld: string[] = [],
): Promise<VerifyResult> {
  const sdjwt = createSdJwtVc();
  const result = await sdjwt.verify(presentation);
  const payload = (result.payload ?? {}) as Record<string, unknown>;
  const payloadKeys = Object.keys(payload);

  const meta = new Set(["iss", "iat", "vct", "cnf", "status", "_sd", "_sd_alg", "exp", "nbf", "sub"]);
  const disclosedClaims: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!meta.has(k) && !k.startsWith("_")) disclosedClaims[k] = v;
  }

  const withheldAbsentFromPayload = expectedWithheld.filter((c) => !(c in payload));

  return {
    signatureValid: true,
    disclosedClaims,
    withheldAbsentFromPayload,
    payloadKeys,
  };
}

/** In-memory holder store for the demo agent */
const holderStore: {
  identity?: string;
  provenance?: string;
} = {};

export async function ensureDemoCredentials(): Promise<{
  identity: string;
  provenance: string;
}> {
  if (!holderStore.identity) {
    const issued = await issue("IdentityVC");
    holderStore.identity = issued.credential;
  }
  if (!holderStore.provenance) {
    const issued = await issue("ProvenanceVC");
    holderStore.provenance = issued.credential;
  }
  return {
    identity: holderStore.identity,
    provenance: holderStore.provenance,
  };
}

export function getHeldCredentials() {
  return { ...holderStore };
}
