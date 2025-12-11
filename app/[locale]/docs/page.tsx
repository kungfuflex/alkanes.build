"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const content = {
  en: {
    title: "Introduction to Alkanes",
    intro: "Alkanes is a metaprotocol built on top of Protorunes that brings smart contract functionality to Bitcoin. Unlike traditional Bitcoin scripts, Alkanes enables complex programmable logic while maintaining the security guarantees of the Bitcoin network.",
    whatTitle: "What are Alkanes?",
    whatContent: "Alkanes are WebAssembly (WASM) smart contracts that run on Bitcoin through the Protorunes protocol. They enable:",
    features: [
      "DeFi on Bitcoin - AMMs, lending, derivatives",
      "Token standards - Fungible and non-fungible tokens",
      "Governance - On-chain voting and DAOs",
      "Complex logic - Arbitrary computation anchored to Bitcoin"
    ],
    howTitle: "How it Works",
    howSteps: [
      "Write contracts in Rust - Use familiar tooling and the alkanes-std library",
      "Compile to WASM - Target wasm32-unknown-unknown",
      "Deploy to Bitcoin - Inscribe the WASM binary via Ordinals",
      "Interact via transactions - Call contract methods through Bitcoin transactions"
    ],
    conceptsTitle: "Key Concepts",
    protorunesTitle: "Protorunes",
    protorunesDesc: "Protorunes extend the Runes protocol with programmable functionality. Each Alkane is a special type of Protorune that contains executable WASM code.",
    dieselTitle: "DIESEL Token",
    dieselDesc: "DIESEL is the native governance token of the Alkanes ecosystem. It's used for voting on protocol upgrades, paying for gas (execution costs), and staking.",
    metashrewTitle: "Metashrew Indexer",
    metashrewDesc: "Metashrew is the indexing infrastructure that processes Bitcoin blocks and maintains Alkane state. It enables fast queries and real-time updates.",
    gettingStartedTitle: "Getting Started",
    quickStartTitle: "Quick Start →",
    quickStartDesc: "Build and deploy your first Alkane in under 10 minutes",
    cliTitle: "CLI Reference →",
    cliDesc: "Complete guide to the alkanes-cli tool",
    architectureTitle: "Architecture Overview",
    resourcesTitle: "Resources",
    resources: [
      { text: "GitHub Repository", href: "https://github.com/kungfuflex/alkanes-rs/tree/develop", desc: "Source code and examples" },
      { text: "Subfrost API", href: "https://mainnet.sandshrew.io", desc: "Hosted indexer infrastructure" },
      { text: "DIESEL Governance", href: "/governance", desc: "Participate in protocol governance" }
    ]
  },
  zh: {
    title: "Alkanes 简介",
    intro: "Alkanes 是基于 Protorunes 构建的元协议，为比特币带来智能合约功能。与传统的比特币脚本不同，Alkanes 能够实现复杂的可编程逻辑，同时保持比特币网络的安全保障。",
    whatTitle: "什么是 Alkanes？",
    whatContent: "Alkanes 是通过 Protorunes 协议在比特币上运行的 WebAssembly (WASM) 智能合约。它们支持：",
    features: [
      "比特币 DeFi - AMM、借贷、衍生品",
      "代币标准 - 同质化和非同质化代币",
      "治理 - 链上投票和 DAO",
      "复杂逻辑 - 锚定于比特币的任意计算"
    ],
    howTitle: "工作原理",
    howSteps: [
      "使用 Rust 编写合约 - 使用熟悉的工具和 alkanes-std 库",
      "编译为 WASM - 目标平台 wasm32-unknown-unknown",
      "部署到比特币 - 通过 Ordinals 铭刻 WASM 二进制文件",
      "通过交易交互 - 通过比特币交易调用合约方法"
    ],
    conceptsTitle: "核心概念",
    protorunesTitle: "Protorunes",
    protorunesDesc: "Protorunes 扩展了 Runes 协议，增加了可编程功能。每个 Alkane 都是一种特殊的 Protorune，包含可执行的 WASM 代码。",
    dieselTitle: "DIESEL 代币",
    dieselDesc: "DIESEL 是 Alkanes 生态系统的原生治理代币。用于协议升级投票、支付 Gas（执行成本）和质押。",
    metashrewTitle: "Metashrew 索引器",
    metashrewDesc: "Metashrew 是处理比特币区块并维护 Alkane 状态的索引基础设施。它支持快速查询和实时更新。",
    gettingStartedTitle: "快速开始",
    quickStartTitle: "快速入门 →",
    quickStartDesc: "10 分钟内构建并部署您的第一个 Alkane",
    cliTitle: "CLI 参考 →",
    cliDesc: "alkanes-cli 工具完整指南",
    architectureTitle: "架构概览",
    resourcesTitle: "资源",
    resources: [
      { text: "GitHub 代码库", href: "https://github.com/kungfuflex/alkanes-rs/tree/develop", desc: "源代码和示例" },
      { text: "Subfrost API", href: "https://mainnet.sandshrew.io", desc: "托管索引器基础设施" },
      { text: "DIESEL 治理", href: "/governance", desc: "参与协议治理" }
    ]
  }
};

export default function DocsIntroPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.whatTitle}</h2>
        <p className="mb-4">{t.whatContent}</p>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.features.map((feature, i) => (
            <li key={i}><strong>{feature.split(" - ")[0]}</strong> - {feature.split(" - ")[1]}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.howTitle}</h2>
        <ol className="list-decimal list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.howSteps.map((step, i) => (
            <li key={i}><strong>{step.split(" - ")[0]}</strong> - {step.split(" - ")[1]}</li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.conceptsTitle}</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-2">{t.protorunesTitle}</h3>
            <p className="text-[color:var(--sf-muted)]">{t.protorunesDesc}</p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">{t.dieselTitle}</h3>
            <p className="text-[color:var(--sf-muted)]">{t.dieselDesc}</p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">{t.metashrewTitle}</h3>
            <p className="text-[color:var(--sf-muted)]">{t.metashrewDesc}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.gettingStartedTitle}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/docs/quickstart" className="block p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)] transition-colors">
            <h3 className="font-semibold mb-2">{t.quickStartTitle}</h3>
            <p className="text-sm text-[color:var(--sf-muted)]">{t.quickStartDesc}</p>
          </Link>
          <Link href="/docs/cli" className="block p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)] transition-colors">
            <h3 className="font-semibold mb-2">{t.cliTitle}</h3>
            <p className="text-sm text-[color:var(--sf-muted)]">{t.cliDesc}</p>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.architectureTitle}</h2>
        <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm">
{`┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
├─────────────────────────────────────────────────────────┤
│                    Subfrost API                          │
│              (REST / JSON-RPC / GraphQL)                │
├─────────────────────────────────────────────────────────┤
│                   Metashrew Indexer                      │
│              (WASM-based block processing)              │
├─────────────────────────────────────────────────────────┤
│                    Bitcoin Network                       │
│              (Transactions & Block Data)                │
└─────────────────────────────────────────────────────────┘`}
        </pre>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.resourcesTitle}</h2>
        <ul className="space-y-2">
          {t.resources.map((resource, i) => (
            <li key={i}>
              <a
                href={resource.href}
                target={resource.href.startsWith("http") ? "_blank" : undefined}
                rel={resource.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-[color:var(--sf-primary)] hover:underline"
              >
                {resource.text}
              </a>
              {" - "}{resource.desc}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
