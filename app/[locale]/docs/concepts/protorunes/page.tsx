"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Protorunes Protocol",
    intro: "Protorunes is the foundation layer that enables Alkanes smart contracts on Bitcoin. It extends the Runes protocol with programmable functionality, allowing for complex on-chain logic while maintaining Bitcoin's security guarantees.",
    whatTitle: "What are Protorunes?",
    whatContent: "Protorunes extend the Runes protocol with:",
    whatFeatures: [
      "Programmable Functionality - Execute arbitrary WASM code",
      "State Management - Maintain persistent contract state",
      "Token Standards - Create and manage fungible tokens",
      "Composability - Enable contract-to-contract interactions"
    ],
    howTitle: "How Protorunes Work",
    encodingTitle: "1. Transaction Encoding",
    encodingContent: "Protorunes data is encoded in Bitcoin transactions using OP_RETURN outputs. Each transaction can contain calldata (instructions for contract execution), token transfers, and state updates.",
    indexingTitle: "2. Indexing",
    indexingContent: "The Metashrew indexer processes Bitcoin blocks, extracts protorune transactions, executes WASM contract code, maintains state database, and provides query interfaces.",
    executionTitle: "3. Execution Model",
    executionSteps: [
      "Transaction is validated against Bitcoin rules",
      "Calldata is extracted and parsed",
      "Target contract's WASM code is executed",
      "State changes are committed",
      "Token transfers are recorded"
    ],
    protocolTagTitle: "Protocol Tag",
    protocolTagContent: "Alkanes uses protocol tag 1n to identify its transactions. This distinguishes Alkanes from other protorune implementations.",
    alkaneIdsTitle: "Alkane IDs",
    alkaneIdsContent: "Each deployed contract receives a unique Alkane ID consisting of the block number and transaction index. For example, [2, 0] refers to DIESEL token.",
    reservedIdsTitle: "Reserved IDs",
    reservedIds: [
      "[2, n] - Standard token deployments",
      "[3, n] - Factory contract deployments",
      "[4, n] - Reserved address space"
    ],
    stateStorageTitle: "State Storage",
    stateStorageContent: "Protorunes provide key-value storage for contracts. State is persisted across transactions and blocks, enabling complex stateful applications.",
    tokenOpsTitle: "Token Operations",
    mintingTitle: "Minting",
    transfersTitle: "Transfers",
    balancesTitle: "Balances",
    securityTitle: "Security Model",
    securityContent: "Protorunes inherit Bitcoin's security:",
    securityFeatures: [
      "All state is anchored to Bitcoin blocks",
      "Transactions are validated by Bitcoin consensus",
      "No separate validator set or bridge required",
      "Deterministic execution ensures consistent state"
    ],
    resourcesTitle: "Resources",
    resources: [
      { text: "Protorunes Repository", href: "https://github.com/kungfuflex/protorune-rs" },
      { text: "Alkanes Implementation", href: "https://github.com/kungfuflex/alkanes-rs/tree/develop" },
      { text: "API Reference", href: "/docs/api" }
    ]
  },
  zh: {
    title: "Protorunes 协议",
    intro: "Protorunes 是在比特币上启用 Alkanes 智能合约的基础层。它扩展了 Runes 协议，增加了可编程功能，允许复杂的链上逻辑，同时保持比特币的安全保障。",
    whatTitle: "什么是 Protorunes？",
    whatContent: "Protorunes 扩展 Runes 协议，提供：",
    whatFeatures: [
      "可编程功能 - 执行任意 WASM 代码",
      "状态管理 - 维护持久化合约状态",
      "代币标准 - 创建和管理同质化代币",
      "可组合性 - 启用合约间交互"
    ],
    howTitle: "Protorunes 工作原理",
    encodingTitle: "1. 交易编码",
    encodingContent: "Protorunes 数据使用 OP_RETURN 输出编码在比特币交易中。每笔交易可以包含调用数据（合约执行指令）、代币转账和状态更新。",
    indexingTitle: "2. 索引",
    indexingContent: "Metashrew 索引器处理比特币区块，提取 protorune 交易，执行 WASM 合约代码，维护状态数据库，并提供查询接口。",
    executionTitle: "3. 执行模型",
    executionSteps: [
      "交易按比特币规则验证",
      "提取并解析调用数据",
      "执行目标合约的 WASM 代码",
      "提交状态变更",
      "记录代币转账"
    ],
    protocolTagTitle: "协议标签",
    protocolTagContent: "Alkanes 使用协议标签 1n 来识别其交易。这将 Alkanes 与其他 protorune 实现区分开来。",
    alkaneIdsTitle: "Alkane ID",
    alkaneIdsContent: "每个部署的合约都会收到一个由区块号和交易索引组成的唯一 Alkane ID。例如，[2, 0] 指的是 DIESEL 代币。",
    reservedIdsTitle: "保留 ID",
    reservedIds: [
      "[2, n] - 标准代币部署",
      "[3, n] - 工厂合约部署",
      "[4, n] - 保留地址空间"
    ],
    stateStorageTitle: "状态存储",
    stateStorageContent: "Protorunes 为合约提供键值存储。状态在交易和区块之间持久化，支持复杂的有状态应用。",
    tokenOpsTitle: "代币操作",
    mintingTitle: "铸造",
    transfersTitle: "转账",
    balancesTitle: "余额",
    securityTitle: "安全模型",
    securityContent: "Protorunes 继承比特币的安全性：",
    securityFeatures: [
      "所有状态都锚定于比特币区块",
      "交易由比特币共识验证",
      "无需单独的验证器集或桥接",
      "确定性执行确保状态一致"
    ],
    resourcesTitle: "资源",
    resources: [
      { text: "Protorunes 代码库", href: "https://github.com/kungfuflex/protorune-rs" },
      { text: "Alkanes 实现", href: "https://github.com/kungfuflex/alkanes-rs/tree/develop" },
      { text: "API 参考", href: "/docs/api" }
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

export default function ProtorunesPage() {
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
          {t.whatFeatures.map((feature, i) => (
            <li key={i}><strong>{feature.split(" - ")[0]}</strong> - {feature.split(" - ")[1]}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.howTitle}</h2>

        <h3 className="text-xl font-medium mb-2">{t.encodingTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.encodingContent}</p>

        <h3 className="text-xl font-medium mb-2">{t.indexingTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.indexingContent}</p>

        <h3 className="text-xl font-medium mb-2">{t.executionTitle}</h3>
        <ol className="list-decimal list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.executionSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.protocolTagTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.protocolTagContent}</p>
        <CodeBlock>{`const ALKANES_PROTOCOL_TAG = 1n;`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.alkaneIdsTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.alkaneIdsContent}</p>

        <h3 className="text-xl font-medium mb-2">{t.reservedIdsTitle}</h3>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.reservedIds.map((id, i) => (
            <li key={i}><code className="px-2 py-1 rounded bg-[color:var(--sf-surface)]">{id.split(" - ")[0]}</code> - {id.split(" - ")[1]}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.stateStorageTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.stateStorageContent}</p>
        <CodeBlock>{`// Store a value
storage::set(b"my_key", &value);

// Retrieve a value
let value = storage::get(b"my_key");`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.tokenOpsTitle}</h2>

        <h3 className="text-xl font-medium mb-2">{t.mintingTitle}</h3>
        <CodeBlock>{`oyl alkane new-token -name "MYTOKEN" -symbol "MTK" -amount 1000000`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.transfersTitle}</h3>
        <CodeBlock>{`oyl alkane send -blk 2 -tx 14 -amt 100 -to <ADDRESS>`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.balancesTitle}</h3>
        <CodeBlock>{`const balance = await alkanes.protorunesbyaddress({
  address: 'bc1...',
  protocolTag: 1n,
});`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.securityTitle}</h2>
        <p className="mb-4">{t.securityContent}</p>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.securityFeatures.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
