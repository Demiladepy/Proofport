import { NextResponse } from "next/server";
import { getWalletInfo } from "@/wallet";

/** Status only — Dynamic MPC SDK is exercised via `npm run smoke:wallet` (tsx), not Turbopack. */
export async function GET() {
  return NextResponse.json(getWalletInfo());
}
