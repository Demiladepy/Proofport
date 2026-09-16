import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const sui = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Proofport",
  description:
    "Agentic cash-out with selective disclosure — prove once, privately, to the regulated edge.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sui.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
