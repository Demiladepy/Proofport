import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proof wall — Proofport",
  description:
    "Every claim Proofport makes, verified live against Base Sepolia from your own browser. Uniswap fill, Dynamic MPC signature, PII-free attestation.",
};

export default function ProofLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
