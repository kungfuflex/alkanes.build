import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { locales, type Locale } from "@/i18n/config";
import "../globals.css";
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

// Site configuration
const siteConfig = {
  name: "DIESEL",
  url: "https://alkanes.build",
  ogImage: "/og-image.png",
  twitterHandle: "@ptrk_btc",
};

// Viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
  ],
};

// Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Generate metadata based on locale
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    en: "DIESEL - Bitcoin DeFi Governance & Smart Contracts on Taproot | Alkanes",
    zh: "DIESEL - 比特币 DeFi 治理与 Taproot 智能合约 | Alkanes 元协议",
  };

  const descriptions: Record<string, string> = {
    en: "DIESEL powers decentralized governance and yield vaults for the Alkanes metaprotocol. Build smart contracts on Bitcoin using Taproot, WASM runtime, and native Bitcoin security. No sidechains, no bridges.",
    zh: "DIESEL 为 Alkanes 元协议提供去中心化治理与收益金库。基于 Taproot 在比特币上构建智能合约，使用 WASM 运行时和原生比特币安全性。无侧链，无跨链桥。",
  };

  const keywordsEN = [
    "DIESEL",
    "Alkanes",
    "Bitcoin DeFi",
    "Taproot",
    "Bitcoin smart contracts",
    "WASM",
    "WebAssembly",
    "Bitcoin governance",
    "decentralized finance",
    "yield vaults",
    "Bitcoin staking",
    "metaprotocol",
    "Runes",
    "Ordinals",
    "Bitcoin Layer 1",
    "native Bitcoin",
    "BTC DeFi",
    "Rust smart contracts",
    "Bitcoin programmability",
  ];

  const keywordsZH = [
    "DIESEL",
    "Alkanes",
    "比特币 DeFi",
    "Taproot",
    "比特币智能合约",
    "WASM",
    "WebAssembly",
    "比特币治理",
    "去中心化金融",
    "收益金库",
    "比特币质押",
    "元协议",
    "符文",
    "铭文",
    "比特币一层",
    "原生比特币",
    "BTC DeFi",
    "Rust 智能合约",
    "比特币可编程性",
  ];

  const currentTitle = titles[locale] || titles.en;
  const currentDescription = descriptions[locale] || descriptions.en;
  const currentKeywords = locale === "zh" ? keywordsZH : keywordsEN;
  const currentLocale = locale === "zh" ? "zh_CN" : "en_US";

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: currentTitle,
      template: `%s | ${siteConfig.name}`,
    },
    description: currentDescription,
    keywords: currentKeywords,
    authors: [{ name: "Alkanes Foundation" }],
    creator: "Alkanes Foundation",
    publisher: "Alkanes Foundation",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: `${siteConfig.url}/${locale}`,
      languages: {
        en: `${siteConfig.url}/en`,
        zh: `${siteConfig.url}/zh`,
        "x-default": `${siteConfig.url}/en`,
      },
    },
    openGraph: {
      type: "website",
      locale: currentLocale,
      alternateLocale: locale === "zh" ? "en_US" : "zh_CN",
      url: `${siteConfig.url}/${locale}`,
      siteName: siteConfig.name,
      title: currentTitle,
      description: currentDescription,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: "DIESEL - Bitcoin DeFi on Alkanes",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: currentTitle,
      description: currentDescription,
      images: [siteConfig.ogImage],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/site.webmanifest",
    category: "technology",
    classification: "Decentralized Finance",
  };
}

// JSON-LD Structured Data
function JsonLd({ locale }: { locale: string }) {
  const isZh = locale === "zh";

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: "DIESEL - Alkanes Protocol",
        description: isZh
          ? "DIESEL 为 Alkanes 元协议提供去中心化治理与收益金库"
          : "DIESEL powers decentralized governance and yield vaults for the Alkanes metaprotocol",
        inLanguage: isZh ? "zh-CN" : "en-US",
        publisher: {
          "@type": "Organization",
          name: "Alkanes Foundation",
          url: siteConfig.url,
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: "Alkanes Foundation",
        url: siteConfig.url,
        logo: {
          "@type": "ImageObject",
          url: `${siteConfig.url}/logo.png`,
        },
        sameAs: [
          "https://github.com/kungfuflex/alkanes-rs",
          "https://twitter.com/ptrk_btc",
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: "Alkanes Protocol",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Bitcoin",
        description: isZh
          ? "基于比特币 Taproot 的智能合约平台和 DeFi 协议"
          : "Smart contract platform and DeFi protocol built on Bitcoin Taproot",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        creator: {
          "@type": "Organization",
          name: "Alkanes Foundation",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: isZh ? "什么是 Alkanes？" : "What is Alkanes?",
            acceptedAnswer: {
              "@type": "Answer",
              text: isZh
                ? "Alkanes 是一个比特币元协议，允许开发者使用 WASM 运行时在比特币上构建和部署智能合约。"
                : "Alkanes is a Bitcoin metaprotocol that enables developers to build and deploy smart contracts on Bitcoin using a WASM runtime.",
            },
          },
          {
            "@type": "Question",
            name: isZh ? "什么是 DIESEL？" : "What is DIESEL?",
            acceptedAnswer: {
              "@type": "Answer",
              text: isZh
                ? "DIESEL 是 Alkanes 协议的治理代币，持有者可以参与协议升级和资金分配的投票。"
                : "DIESEL is the governance token for the Alkanes protocol, allowing holders to vote on protocol upgrades and treasury allocation.",
            },
          },
          {
            "@type": "Question",
            name: isZh
              ? "Alkanes 如何实现比特币安全性？"
              : "How does Alkanes achieve Bitcoin security?",
            acceptedAnswer: {
              "@type": "Answer",
              text: isZh
                ? "所有 Alkanes 状态都锚定于比特币主链。无需侧链或跨链桥，所有数据都直接存储在比特币区块链上。"
                : "All Alkanes state is anchored to Bitcoin mainnet. No sidechains or bridges are required - all data is stored directly on the Bitcoin blockchain.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <JsonLd locale={locale} />
        {/* Google API for Drive backup functionality */}
        <script src="https://apis.google.com/js/api.js" async defer />
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
