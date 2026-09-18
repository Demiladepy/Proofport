import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

const FALLBACK_PROOF = "0xab18207957208a31025306f08556893e2a15dBa9";
const FALLBACK_EXEC = "0x0afC983C15444DFDaaD76aBF22f1D1053035AE67";
const FALLBACK_CONTRACT = "0xac188e1e9d624b346006dfe233290751165f2f16";

export async function GET() {
  let proofWallet = FALLBACK_PROOF;
  let executionWallet = FALLBACK_EXEC;
  let walletsNote = "dual agent wallets on Base Sepolia";

  try {
    const { getDualWallets } = await import("@/wallet/dual");
    const store = getDualWallets();
    proofWallet = store.proof.address;
    executionWallet = store.execution.address;
    walletsNote = store.note.replace(/—/g, ":");
  } catch {
    const file = join(process.cwd(), ".data", "wallets-v2.json");
    if (existsSync(file)) {
      const j = JSON.parse(readFileSync(file, "utf8")) as {
        proof: { address: string };
        execution: { address: string };
        note?: string;
      };
      proofWallet = j.proof.address;
      executionWallet = j.execution.address;
      if (j.note) walletsNote = j.note.replace(/—/g, ":");
    }
  }

  let reputationContract =
    process.env.REPUTATION_CONTRACT ?? FALLBACK_CONTRACT;
  const addrFile = join(process.cwd(), ".data", "reputation-address.json");
  if (!process.env.REPUTATION_CONTRACT && existsSync(addrFile)) {
    const j = JSON.parse(readFileSync(addrFile, "utf8")) as { address: string };
    reputationContract = j.address;
  }

  const { getSwapRailInfo } = await import("@/swap");
  const { getDynamicRailStatus } = await import("@/wallet/dynamic-status");
  const dynamic = await getDynamicRailStatus();
  const swap = getSwapRailInfo();

  return NextResponse.json({
    chain: "Base Sepolia",
    explorerBase: "https://sepolia.basescan.org",
    proofWallet,
    executionWallet,
    reputationContract,
    walletsNote,
    swapProvider: swap.swapProvider,
    swapLabel: swap.swapLabel,
    swapRouter: swap.swapRouter,
    uniswapLive: swap.uniswapLive,
    tradingApi: swap.tradingApi,
    x402Mode: "Payment header retry",
    partner: "Not sent from this app",
    dynamic,
  });
}
