"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "DataAPI Commands",
    intro: "The dataapi namespace provides high-level queries for Alkanes tokens, AMM pools, balances, and market data via the SUBFROST Data API.",
    configTitle: "Configuration",
    configDesc: "The Data API uses a separate endpoint from JSON-RPC:",
    alkanesQueriesTitle: "Alkanes Queries",
    alkanesQueries: [
      { cmd: "get-alkanes", desc: "Get all alkanes tokens" },
      { cmd: "get-alkanes-by-address", desc: "Get alkanes for an address" },
      { cmd: "get-alkane-details", desc: "Get details for a specific alkane" }
    ],
    poolTitle: "Pool & AMM",
    poolCommands: [
      { cmd: "get-pools", desc: "Get all liquidity pools" },
      { cmd: "get-pool-by-id", desc: "Get pool details by ID" },
      { cmd: "get-pool-history", desc: "Get historical pool data" },
      { cmd: "get-swap-history", desc: "Get swap history" }
    ],
    balancesTitle: "Balances",
    balanceCommands: [
      { cmd: "get-address-balances", desc: "Get alkane balances for an address (with UTXO tracking)" },
      { cmd: "get-outpoint-balances", desc: "Get alkane balances for a specific outpoint" },
      { cmd: "get-holders", desc: "Get holders of an alkane token" },
      { cmd: "get-holder-count", desc: "Get holder count for an alkane" }
    ],
    marketTitle: "Market Data",
    marketCommands: [
      { cmd: "get-bitcoin-price", desc: "Get current Bitcoin price" },
      { cmd: "get-market-chart", desc: "Get Bitcoin market chart" }
    ],
    indexerTitle: "Indexer Status",
    indexerCommands: [
      { cmd: "get-block-height", desc: "Get latest processed block height" },
      { cmd: "get-block-hash", desc: "Get latest processed block hash" },
      { cmd: "get-indexer-position", desc: "Get indexer position (height + hash)" },
      { cmd: "health", desc: "Health check" }
    ],
    getAlkanesTitle: "dataapi get-alkanes",
    getAlkanesDesc: "Get all alkanes tokens indexed by the system.",
    getAlkanesByAddrTitle: "dataapi get-alkanes-by-address",
    getAlkanesByAddrDesc: "Get alkanes tokens held by a specific address.",
    getPoolsTitle: "dataapi get-pools",
    getPoolsDesc: "Get all liquidity pools from the AMM factory.",
    getPoolByIdTitle: "dataapi get-pool-by-id",
    getPoolByIdDesc: "Get details for a specific liquidity pool.",
    getAddressBalancesTitle: "dataapi get-address-balances",
    getAddressBalancesDesc: "Get alkane balances for an address with UTXO tracking.",
    getHoldersTitle: "dataapi get-holders",
    getHoldersDesc: "Get all holders of a specific alkane token.",
    getHolderCountTitle: "dataapi get-holder-count",
    getHolderCountDesc: "Get the number of unique holders for an alkane token.",
    getBitcoinPriceTitle: "dataapi get-bitcoin-price",
    getBitcoinPriceDesc: "Get the current Bitcoin price.",
    getBlockHeightTitle: "dataapi get-block-height",
    getBlockHeightDesc: "Get the latest block height processed by the indexer.",
    healthTitle: "dataapi health",
    healthDesc: "Check if the Data API is healthy.",
    restTitle: "REST API Equivalent",
    restDesc: "These DataAPI commands correspond to REST endpoints:"
  },
  zh: {
    title: "DataAPI 命令",
    intro: "dataapi 命名空间通过 SUBFROST Data API 提供 Alkanes 代币、AMM 池、余额和市场数据的高级查询。",
    configTitle: "配置",
    configDesc: "Data API 使用与 JSON-RPC 不同的端点：",
    alkanesQueriesTitle: "Alkanes 查询",
    alkanesQueries: [
      { cmd: "get-alkanes", desc: "获取所有 alkanes 代币" },
      { cmd: "get-alkanes-by-address", desc: "获取地址持有的 alkanes" },
      { cmd: "get-alkane-details", desc: "获取特定 alkane 的详情" }
    ],
    poolTitle: "池与 AMM",
    poolCommands: [
      { cmd: "get-pools", desc: "获取所有流动性池" },
      { cmd: "get-pool-by-id", desc: "按 ID 获取池详情" },
      { cmd: "get-pool-history", desc: "获取历史池数据" },
      { cmd: "get-swap-history", desc: "获取交换历史" }
    ],
    balancesTitle: "余额",
    balanceCommands: [
      { cmd: "get-address-balances", desc: "获取地址的 alkane 余额（带 UTXO 跟踪）" },
      { cmd: "get-outpoint-balances", desc: "获取特定 outpoint 的 alkane 余额" },
      { cmd: "get-holders", desc: "获取 alkane 代币的持有者" },
      { cmd: "get-holder-count", desc: "获取 alkane 的持有者数量" }
    ],
    marketTitle: "市场数据",
    marketCommands: [
      { cmd: "get-bitcoin-price", desc: "获取当前比特币价格" },
      { cmd: "get-market-chart", desc: "获取比特币市场图表" }
    ],
    indexerTitle: "索引器状态",
    indexerCommands: [
      { cmd: "get-block-height", desc: "获取最新处理的区块高度" },
      { cmd: "get-block-hash", desc: "获取最新处理的区块哈希" },
      { cmd: "get-indexer-position", desc: "获取索引器位置（高度 + 哈希）" },
      { cmd: "health", desc: "健康检查" }
    ],
    getAlkanesTitle: "dataapi get-alkanes",
    getAlkanesDesc: "获取系统索引的所有 alkanes 代币。",
    getAlkanesByAddrTitle: "dataapi get-alkanes-by-address",
    getAlkanesByAddrDesc: "获取特定地址持有的 alkanes 代币。",
    getPoolsTitle: "dataapi get-pools",
    getPoolsDesc: "从 AMM 工厂获取所有流动性池。",
    getPoolByIdTitle: "dataapi get-pool-by-id",
    getPoolByIdDesc: "获取特定流动性池的详情。",
    getAddressBalancesTitle: "dataapi get-address-balances",
    getAddressBalancesDesc: "获取地址的 alkane 余额（带 UTXO 跟踪）。",
    getHoldersTitle: "dataapi get-holders",
    getHoldersDesc: "获取特定 alkane 代币的所有持有者。",
    getHolderCountTitle: "dataapi get-holder-count",
    getHolderCountDesc: "获取 alkane 代币的唯一持有者数量。",
    getBitcoinPriceTitle: "dataapi get-bitcoin-price",
    getBitcoinPriceDesc: "获取当前比特币价格。",
    getBlockHeightTitle: "dataapi get-block-height",
    getBlockHeightDesc: "获取索引器处理的最新区块高度。",
    healthTitle: "dataapi health",
    healthDesc: "检查 Data API 是否健康。",
    restTitle: "REST API 对应端点",
    restDesc: "这些 DataAPI 命令对应以下 REST 端点："
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

function CommandTable({ commands }: { commands: { cmd: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[color:var(--sf-outline)]">
            <th className="text-left py-2 px-3">Command</th>
            <th className="text-left py-2 px-3">Description</th>
          </tr>
        </thead>
        <tbody>
          {commands.map((cmd, i) => (
            <tr key={i} className="border-b border-[color:var(--sf-outline)]">
              <td className="py-2 px-3 font-mono">{cmd.cmd}</td>
              <td className="py-2 px-3 text-[color:var(--sf-muted)]">{cmd.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DataAPICommandsPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.configTitle}</h2>
        <p className="mb-4">{t.configDesc}</p>
        <CodeBlock>{`# Using the data API endpoint
alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-alkanes

# Or with your API key for higher rate limits:
--data-api https://mainnet.subfrost.io/v4/YOUR_API_KEY`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.alkanesQueriesTitle}</h2>
        <CommandTable commands={t.alkanesQueries} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.poolTitle}</h2>
        <CommandTable commands={t.poolCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.balancesTitle}</h2>
        <CommandTable commands={t.balanceCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.marketTitle}</h2>
        <CommandTable commands={t.marketCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.indexerTitle}</h2>
        <CommandTable commands={t.indexerCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getAlkanesTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getAlkanesDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-alkanes

# Example Output:
# Alkanes Tokens
# ═══════════════════════════════════
#
# 1. 2:0
# 2. 32:0
# 3. 4:65522
# ...
#
# Total: 25`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getAlkanesByAddrTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getAlkanesByAddrDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-alkanes-by-address bc1p...

# Arguments:
# <ADDRESS>  Bitcoin address to query`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getPoolsTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getPoolsDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-pools

# Example Output:
# Liquidity Pools
# ═══════════════════════════════════
#
# 1. DIESEL / frBTC LP
#    Pool ID: 2:3
#    Pair: 2:0 → 32:0
#    Reserves: 300000000 × 50000
#    LP Supply: 3872983
#    Creator: bc1p...
#
# Total: 1 pools`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getPoolByIdTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getPoolByIdDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-pool-by-id 2:3

# Arguments:
# <POOL_ID>  Pool ID (format: block:tx)`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getAddressBalancesTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getAddressBalancesDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-address-balances bc1p...

# Arguments:
# <ADDRESS>  Bitcoin address to query

# Returns balances broken down by UTXO for accurate tracking.`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getHoldersTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getHoldersDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-holders 2:0

# Arguments:
# <ALKANE_ID>  Alkane ID`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getHolderCountTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getHolderCountDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-holder-count 2:0

# Arguments:
# <ALKANE_ID>  Alkane ID`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getBitcoinPriceTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getBitcoinPriceDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-bitcoin-price`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getBlockHeightTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getBlockHeightDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi get-block-height

# Example Output:
# {
#   "height": 850123
# }`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.healthTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.healthDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --data-api https://mainnet.subfrost.io/v4/api \\
  dataapi health

# Output:
# OK`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.restTitle}</h2>
        <p className="mb-4">{t.restDesc}</p>
        <CodeBlock>{`# CLI → REST endpoint mapping:
# get-alkanes → GET /alkanes
# get-pools → GET /pools
# get-address-balances → GET /address/{address}/balances
# get-block-height → GET /indexer/height
# health → GET /health`}</CodeBlock>
      </div>
    </div>
  );
}
