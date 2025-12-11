"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const content = {
  en: {
    title: "alkanes-cli & @alkanes/ts-sdk",
    intro: "The alkanes-cli command-line tool and @alkanes/ts-sdk TypeScript library provide comprehensive access to the Alkanes protocol, Bitcoin blockchain, and SUBFROST APIs.",
    whatIsTitle: "What is alkanes-cli?",
    whatIsIntro: "alkanes-cli is a powerful command-line interface for:",
    features: [
      { title: "Wallet Management", desc: "Create, manage, and sign transactions with HD wallets" },
      { title: "Alkanes Protocol", desc: "Deploy contracts, execute transactions, and query balances" },
      { title: "AMM & Liquidity", desc: "Initialize pools, execute swaps, and manage liquidity" },
      { title: "Bitcoin Operations", desc: "Query blocks, transactions, UTXOs, and fee estimates" },
      { title: "Ordinals & Runes", desc: "Query inscriptions, runes, and sat information" }
    ],
    endpointsTitle: "Network Endpoints",
    endpointsIntro: "The CLI can connect to SUBFROST APIs on different networks:",
    endpoints: [
      { network: "Mainnet", jsonrpc: "https://mainnet.subfrost.io/v4/jsonrpc", dataapi: "https://mainnet.subfrost.io/v4/api" },
      { network: "Signet", jsonrpc: "https://signet.subfrost.io/v4/jsonrpc", dataapi: "https://signet.subfrost.io/v4/api" },
      { network: "Regtest", jsonrpc: "https://regtest.subfrost.io/v4/jsonrpc", dataapi: "https://regtest.subfrost.io/v4/api" }
    ],
    namespacesTitle: "Command Namespaces",
    namespaces: [
      { cmd: "wallet", desc: "HD wallet creation, addresses, signing, and transactions" },
      { cmd: "alkanes", desc: "Alkanes protocol operations (execute, simulate, trace, swap)" },
      { cmd: "ord", desc: "Ordinals protocol queries (inscriptions, runes, sats)" },
      { cmd: "esplora", desc: "Block explorer queries (blocks, transactions, addresses)" },
      { cmd: "dataapi", desc: "High-level data queries (alkanes, pools, balances)" },
      { cmd: "metashrew", desc: "Low-level indexer queries" },
      { cmd: "bitcoind", desc: "Bitcoin Core RPC passthrough" },
      { cmd: "lua", desc: "Server-side Lua script execution" }
    ],
    globalOptionsTitle: "Global Options",
    sdkTitle: "TypeScript SDK (@alkanes/ts-sdk)",
    sdkIntro: "The same functionality is available in TypeScript:",
    nextStepsTitle: "Next Steps",
    nextSteps: [
      { text: "Installation", href: "/docs/cli/installation", desc: "Install the CLI and SDK" },
      { text: "Wallet Commands", href: "/docs/cli/wallet", desc: "Wallet management" },
      { text: "Alkanes Commands", href: "/docs/cli/alkanes", desc: "Protocol operations" },
      { text: "DataAPI Commands", href: "/docs/cli/dataapi", desc: "High-level queries" }
    ]
  },
  zh: {
    title: "alkanes-cli 与 @alkanes/ts-sdk",
    intro: "alkanes-cli 命令行工具和 @alkanes/ts-sdk TypeScript 库提供对 Alkanes 协议、比特币区块链和 SUBFROST API 的全面访问。",
    whatIsTitle: "什么是 alkanes-cli？",
    whatIsIntro: "alkanes-cli 是一个功能强大的命令行界面，用于：",
    features: [
      { title: "钱包管理", desc: "创建、管理 HD 钱包并签署交易" },
      { title: "Alkanes 协议", desc: "部署合约、执行交易、查询余额" },
      { title: "AMM 与流动性", desc: "初始化池、执行交换、管理流动性" },
      { title: "比特币操作", desc: "查询区块、交易、UTXO 和费率估算" },
      { title: "Ordinals 与 Runes", desc: "查询铭文、符文和聪信息" }
    ],
    endpointsTitle: "网络端点",
    endpointsIntro: "CLI 可以连接到不同网络的 SUBFROST API：",
    endpoints: [
      { network: "主网", jsonrpc: "https://mainnet.subfrost.io/v4/jsonrpc", dataapi: "https://mainnet.subfrost.io/v4/api" },
      { network: "Signet", jsonrpc: "https://signet.subfrost.io/v4/jsonrpc", dataapi: "https://signet.subfrost.io/v4/api" },
      { network: "Regtest", jsonrpc: "https://regtest.subfrost.io/v4/jsonrpc", dataapi: "https://regtest.subfrost.io/v4/api" }
    ],
    namespacesTitle: "命令命名空间",
    namespaces: [
      { cmd: "wallet", desc: "HD 钱包创建、地址、签名和交易" },
      { cmd: "alkanes", desc: "Alkanes 协议操作（执行、模拟、跟踪、交换）" },
      { cmd: "ord", desc: "Ordinals 协议查询（铭文、符文、聪）" },
      { cmd: "esplora", desc: "区块浏览器查询（区块、交易、地址）" },
      { cmd: "dataapi", desc: "高级数据查询（alkanes、池、余额）" },
      { cmd: "metashrew", desc: "底层索引器查询" },
      { cmd: "bitcoind", desc: "Bitcoin Core RPC 透传" },
      { cmd: "lua", desc: "服务器端 Lua 脚本执行" }
    ],
    globalOptionsTitle: "全局选项",
    sdkTitle: "TypeScript SDK (@alkanes/ts-sdk)",
    sdkIntro: "TypeScript 中提供相同的功能：",
    nextStepsTitle: "后续步骤",
    nextSteps: [
      { text: "安装", href: "/docs/cli/installation", desc: "安装 CLI 和 SDK" },
      { text: "钱包命令", href: "/docs/cli/wallet", desc: "钱包管理" },
      { text: "Alkanes 命令", href: "/docs/cli/alkanes", desc: "协议操作" },
      { text: "DataAPI 命令", href: "/docs/cli/dataapi", desc: "高级查询" }
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

export default function CLIOverviewPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.whatIsTitle}</h2>
        <p className="mb-4">{t.whatIsIntro}</p>
        <div className="grid md:grid-cols-2 gap-3">
          {t.features.map((feature, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <h3 className="font-semibold text-sm">{feature.title}</h3>
              <p className="text-xs text-[color:var(--sf-muted)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.endpointsTitle}</h2>
        <p className="mb-4">{t.endpointsIntro}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Network</th>
                <th className="text-left py-2 px-3">JSON-RPC</th>
                <th className="text-left py-2 px-3">Data API</th>
              </tr>
            </thead>
            <tbody>
              {t.endpoints.map((ep, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-medium">{ep.network}</td>
                  <td className="py-2 px-3 font-mono text-xs">{ep.jsonrpc}</td>
                  <td className="py-2 px-3 font-mono text-xs">{ep.dataapi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.namespacesTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Command</th>
                <th className="text-left py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.namespaces.map((ns, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono">{ns.cmd}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{ns.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.globalOptionsTitle}</h2>
        <CodeBlock>{`alkanes-cli [OPTIONS] <COMMAND>

Options:
  --wallet-file <PATH>        Path to wallet file (default: ~/.alkanes/wallet.json)
  --passphrase <PASSPHRASE>   Wallet passphrase for signing
  --jsonrpc-url <URL>         JSON-RPC endpoint URL
  --data-api <URL>            Data API endpoint URL
  --subfrost-api-key <KEY>    SUBFROST API key (or use SUBFROST_API_KEY env)
  -p, --provider <PROVIDER>   Network provider [default: regtest]
                              Options: mainnet, signet, regtest
  -h, --help                  Print help
  -V, --version               Print version`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.sdkTitle}</h2>
        <p className="mb-4">{t.sdkIntro}</p>
        <CodeBlock>{`import {
  createKeystore,
  unlockKeystore,
  createWallet,
  createProvider
} from '@alkanes/ts-sdk';

// Create a provider
const provider = createProvider({
  url: 'https://mainnet.subfrost.io/v4/jsonrpc',
  networkType: 'mainnet',
});

// Get block height
const height = await provider.getBlockHeight();
console.log('Block height:', height);`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.nextStepsTitle}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {t.nextSteps.map((step, i) => (
            <Link key={i} href={step.href} className="block p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)] transition-colors">
              <h3 className="font-semibold mb-1">{step.text} →</h3>
              <p className="text-sm text-[color:var(--sf-muted)]">{step.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
