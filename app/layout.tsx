import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Sans-serif font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Monospace font
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DIESEL - Alkanes Governance & Vaults",
  description:
    "DIESEL governance, vault performance, and documentation for the Alkanes metaprotocol on Bitcoin",
  keywords: [
    "diesel",
    "alkanes",
    "bitcoin",
    "smart contracts",
    "governance",
    "vaults",
    "defi",
  ],
  openGraph: {
    title: "DIESEL - Alkanes Governance & Vaults",
    description:
      "DIESEL governance, vault performance, and documentation for the Alkanes metaprotocol on Bitcoin",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
