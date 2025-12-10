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
  title: "Alkanes - Bitcoin Smart Contracts",
  description:
    "Documentation and governance for the Alkanes metaprotocol on Bitcoin",
  keywords: [
    "alkanes",
    "bitcoin",
    "smart contracts",
    "protorunes",
    "diesel",
    "governance",
  ],
  openGraph: {
    title: "Alkanes - Bitcoin Smart Contracts",
    description:
      "Documentation and governance for the Alkanes metaprotocol on Bitcoin",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
