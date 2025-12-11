"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Alkanes Contracts",
    intro: "Alkanes contracts are smart contracts that run on Bitcoin, enabling programmable functionality similar to what Ethereum smart contracts provide. They allow developers to create decentralized applications (dApps) directly on Bitcoin's L1 blockchain, without requiring additional layers or sidechains.",
    featuresTitle: "Key Features",
    features: [
      { title: "Native Bitcoin Integration", desc: "Contracts interact directly with Bitcoin transactions and UTXOs" },
      { title: "State Management", desc: "Maintain contract state between interactions" },
      { title: "Composability", desc: "Contracts can interact with each other" },
      { title: "WASM Runtime", desc: "Written in Rust, compiled to WebAssembly" }
    ],
    structureTitle: "Contract Structure",
    structureIntro: "An Alkanes contract typically consists of:",
    structure: [
      "State Storage - Key-value storage for maintaining contract data",
      "Opcodes - Numbered functions that define contract actions",
      "Response Handling - Logic for returning data and managing assets",
      "Asset Management - Capabilities for handling Bitcoin and Alkanes tokens"
    ],
    tokensTitle: "Alkanes Tokens",
    tokensIntro: "Alkanes token contracts are a standardized implementation pattern that represent fungible tokens - digital assets where each unit is identical and interchangeable.",
    tokensContent: "At their core, Alkanes token contracts maintain a mapping of addresses to a balance sheet, tracking token ownership through key-value state storage. The critical operations are transfers (moving tokens between addresses) and approvals (allowing another address to transfer tokens on your behalf).",
    tokenFeaturesTitle: "Token Features",
    tokenFeatures: [
      "Minting and burning capabilities (often with access controls)",
      "Token metadata (name, symbol, decimals)",
      "Transfer hooks for additional logic",
      "Supply caps or other monetary policy",
      "Snapshot functionality for governance"
    ],
    factoryTitle: "Factory Contracts",
    factoryIntro: "Alkanes factory contracts are a design pattern that enables programmatic cloning of a base contract. For example, you may want to deploy a single factory contract that defines the logic for token minting and distribution and then use clones of that contract to create individual tokens that inherit that logic.",
    factoryContent: "A factory contract uses Alkanes's FACTORYRESERVED opcode to deploy new contract instances, typically taking parameters like token name, symbol, total supply, and mint parameters.",
    factoryUseCasesTitle: "Factory Use Cases",
    factoryUseCases: [
      "Deploy pairs of tokens for AMMs",
      "Create wrapped asset tokens",
      "Mint governance tokens for new projects",
      "Standardized, gas-efficient token deployment"
    ],
    exampleTitle: "Example Contract",
    nextStepsTitle: "Next Steps",
    nextSteps: [
      { text: "Quick Start guide", href: "/docs/quickstart", desc: "Deploy your first contract" },
      { text: "CLI commands", href: "/docs/cli", desc: "Deployment and interaction" },
      { text: "API", href: "/docs/api", desc: "Programmatic access" }
    ]
  },
  zh: {
    title: "Alkanes 合约",
    intro: "Alkanes 合约是在比特币上运行的智能合约，提供类似于以太坊智能合约的可编程功能。它们允许开发者直接在比特币 L1 区块链上创建去中心化应用（dApps），无需额外的层或侧链。",
    featuresTitle: "核心特性",
    features: [
      { title: "原生比特币集成", desc: "合约直接与比特币交易和 UTXO 交互" },
      { title: "状态管理", desc: "在交互之间维护合约状态" },
      { title: "可组合性", desc: "合约可以相互交互" },
      { title: "WASM 运行时", desc: "使用 Rust 编写，编译为 WebAssembly" }
    ],
    structureTitle: "合约结构",
    structureIntro: "Alkanes 合约通常包含：",
    structure: [
      "状态存储 - 用于维护合约数据的键值存储",
      "操作码 - 定义合约操作的编号函数",
      "响应处理 - 返回数据和管理资产的逻辑",
      "资产管理 - 处理比特币和 Alkanes 代币的能力"
    ],
    tokensTitle: "Alkanes 代币",
    tokensIntro: "Alkanes 代币合约是一种标准化的实现模式，代表同质化代币——每个单位都相同且可互换的数字资产。",
    tokensContent: "其核心是，Alkanes 代币合约维护地址到余额表的映射，通过键值状态存储跟踪代币所有权。关键操作是转账（在地址之间转移代币）和授权（允许另一个地址代表您转移代币）。",
    tokenFeaturesTitle: "代币特性",
    tokenFeatures: [
      "铸造和销毁功能（通常带有访问控制）",
      "代币元数据（名称、符号、小数位）",
      "转账钩子用于额外逻辑",
      "供应上限或其他货币政策",
      "用于治理的快照功能"
    ],
    factoryTitle: "工厂合约",
    factoryIntro: "Alkanes 工厂合约是一种设计模式，可以程序化地克隆基础合约。例如，您可能想部署一个定义代币铸造和分发逻辑的工厂合约，然后使用该合约的克隆来创建继承该逻辑的单独代币。",
    factoryContent: "工厂合约使用 Alkanes 的 FACTORYRESERVED 操作码部署新的合约实例，通常接受代币名称、符号、总供应量和铸造参数等参数。",
    factoryUseCasesTitle: "工厂用例",
    factoryUseCases: [
      "为 AMM 部署代币对",
      "创建封装资产代币",
      "为新项目铸造治理代币",
      "标准化、高效的代币部署"
    ],
    exampleTitle: "示例合约",
    nextStepsTitle: "后续步骤",
    nextSteps: [
      { text: "快速入门指南", href: "/docs/quickstart", desc: "部署您的第一个合约" },
      { text: "CLI 命令", href: "/docs/cli", desc: "部署和交互" },
      { text: "API", href: "/docs/api", desc: "程序化访问" }
    ]
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

export default function AlkanesConceptsPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.featuresTitle}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {t.features.map((feature, i) => (
            <div key={i} className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[color:var(--sf-muted)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.structureTitle}</h2>
        <p className="mb-4">{t.structureIntro}</p>
        <ol className="list-decimal list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.structure.map((item, i) => (
            <li key={i}><strong>{item.split(" - ")[0]}</strong> - {item.split(" - ")[1]}</li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.tokensTitle}</h2>
        <p className="mb-4">{t.tokensIntro}</p>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.tokensContent}</p>

        <h3 className="text-xl font-medium mb-2">{t.tokenFeaturesTitle}</h3>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.tokenFeatures.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.factoryTitle}</h2>
        <p className="mb-4">{t.factoryIntro}</p>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.factoryContent}</p>

        <h3 className="text-xl font-medium mb-2">{t.factoryUseCasesTitle}</h3>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.factoryUseCases.map((useCase, i) => (
            <li key={i}>{useCase}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.exampleTitle}</h2>
        <CodeBlock>{`use alkanes_std::prelude::*;
use alkanes_support::context::Context;

#[derive(Default)]
pub struct MyAlkane {
    counter: u64,
}

impl MyAlkane {
    pub fn new() -> Self {
        Self { counter: 0 }
    }

    pub fn increment(&mut self) {
        self.counter += 1;
    }

    pub fn get_count(&self) -> u64 {
        self.counter
    }
}

// Export the contract
alkane!(MyAlkane);`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.nextStepsTitle}</h2>
        <ul className="space-y-2">
          {t.nextSteps.map((step, i) => (
            <li key={i}>
              <a href={step.href} className="text-[color:var(--sf-primary)] hover:underline">
                {step.text}
              </a>
              {" - "}{step.desc}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
