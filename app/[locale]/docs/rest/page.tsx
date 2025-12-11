"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "REST API Overview",
    intro: "The Subfrost REST API provides high-level endpoints for alkanes, AMM pools, and blockchain data. These endpoints are part of the alkanes-data-api service.",
    baseUrlsTitle: "Base URLs",
    baseUrlsDesc: "Choose the network for your application:",
    networks: [
      { name: "Mainnet", url: "https://mainnet.subfrost.io/v4/api" },
      { name: "Signet", url: "https://signet.subfrost.io/v4/api" },
      { name: "Regtest", url: "https://regtest.subfrost.io/v4/api" }
    ],
    authTitle: "Authentication",
    authMethods: [
      "Public endpoint - /v4/api/{route} (with CORS from registered domain)",
      "API key in path - /v4/{api_key}/{route}",
      "API key header - /v4/api/{route} with x-subfrost-api-key header"
    ],
    requestFormatTitle: "Request Format",
    requestFormatDesc: "All endpoints accept POST requests with JSON bodies.",
    responseFormatTitle: "Response Format",
    responseFormatDesc: "All responses follow this structure:",
    endpointCategoriesTitle: "Endpoint Categories",
    alkanesTitle: "Alkanes",
    alkanesDesc: "Query alkane tokens and contracts.",
    alkanesEndpoints: [
      { endpoint: "POST /get-alkanes", desc: "List all alkanes" },
      { endpoint: "POST /get-alkanes-by-address", desc: "Alkanes for an address" },
      { endpoint: "POST /get-alkane-details", desc: "Specific alkane info" },
      { endpoint: "POST /global-alkanes-search", desc: "Search alkanes" }
    ],
    poolsTitle: "Pools & AMM",
    poolsDesc: "Liquidity pools and AMM operations.",
    poolsEndpoints: [
      { endpoint: "POST /get-pools", desc: "List all pools" },
      { endpoint: "POST /get-pool-details", desc: "Pool details" },
      { endpoint: "POST /get-all-pools-details", desc: "All pool details" },
      { endpoint: "POST /address-positions", desc: "Liquidity positions" }
    ],
    bitcoinTitle: "Bitcoin/UTXOs",
    bitcoinDesc: "Bitcoin balance and UTXO queries.",
    bitcoinEndpoints: [
      { endpoint: "POST /get-address-balance", desc: "Address balance" },
      { endpoint: "POST /get-taproot-balance", desc: "Taproot balance" },
      { endpoint: "POST /get-address-utxos", desc: "Address UTXOs" },
      { endpoint: "POST /get-account-utxos", desc: "Account UTXOs" }
    ],
    historyTitle: "History",
    historyDesc: "Transaction history for AMM operations.",
    historyEndpoints: [
      { endpoint: "POST /get-pool-swap-history", desc: "Pool swap history" },
      { endpoint: "POST /get-token-swap-history", desc: "Token swap history" },
      { endpoint: "POST /get-pool-mint-history", desc: "Liquidity adds" },
      { endpoint: "POST /get-pool-burn-history", desc: "Liquidity removes" }
    ],
    priceTitle: "Bitcoin Price",
    priceDesc: "Real-time BTC price from Uniswap V3 WBTC/USDC pool.",
    priceEndpoints: [
      { endpoint: "POST /get-bitcoin-price", desc: "Current BTC price in USD" },
      { endpoint: "POST /get-bitcoin-market-chart", desc: "Historical price data" },
      { endpoint: "POST /get-bitcoin-market-weekly", desc: "52-week high/low" }
    ],
    healthTitle: "Health Check",
    exampleTitle: "JavaScript Example"
  },
  zh: {
    title: "REST API 概述",
    intro: "Subfrost REST API 提供了 alkanes、AMM 池和区块链数据的高级端点。这些端点是 alkanes-data-api 服务的一部分。",
    baseUrlsTitle: "基础 URL",
    baseUrlsDesc: "根据您的应用选择网络：",
    networks: [
      { name: "主网", url: "https://mainnet.subfrost.io/v4/api" },
      { name: "Signet", url: "https://signet.subfrost.io/v4/api" },
      { name: "Regtest", url: "https://regtest.subfrost.io/v4/api" }
    ],
    authTitle: "认证",
    authMethods: [
      "公共端点 - /v4/api/{route}（需要来自注册域的 CORS）",
      "路径中的 API 密钥 - /v4/{api_key}/{route}",
      "API 密钥头 - /v4/api/{route} 配合 x-subfrost-api-key 头"
    ],
    requestFormatTitle: "请求格式",
    requestFormatDesc: "所有端点接受带有 JSON 请求体的 POST 请求。",
    responseFormatTitle: "响应格式",
    responseFormatDesc: "所有响应遵循以下结构：",
    endpointCategoriesTitle: "端点分类",
    alkanesTitle: "Alkanes",
    alkanesDesc: "查询 alkane 代币和合约。",
    alkanesEndpoints: [
      { endpoint: "POST /get-alkanes", desc: "列出所有 alkanes" },
      { endpoint: "POST /get-alkanes-by-address", desc: "按地址查询 alkanes" },
      { endpoint: "POST /get-alkane-details", desc: "特定 alkane 信息" },
      { endpoint: "POST /global-alkanes-search", desc: "搜索 alkanes" }
    ],
    poolsTitle: "池与 AMM",
    poolsDesc: "流动性池和 AMM 操作。",
    poolsEndpoints: [
      { endpoint: "POST /get-pools", desc: "列出所有池" },
      { endpoint: "POST /get-pool-details", desc: "池详情" },
      { endpoint: "POST /get-all-pools-details", desc: "所有池详情" },
      { endpoint: "POST /address-positions", desc: "流动性仓位" }
    ],
    bitcoinTitle: "比特币/UTXO",
    bitcoinDesc: "比特币余额和 UTXO 查询。",
    bitcoinEndpoints: [
      { endpoint: "POST /get-address-balance", desc: "地址余额" },
      { endpoint: "POST /get-taproot-balance", desc: "Taproot 余额" },
      { endpoint: "POST /get-address-utxos", desc: "地址 UTXO" },
      { endpoint: "POST /get-account-utxos", desc: "账户 UTXO" }
    ],
    historyTitle: "历史记录",
    historyDesc: "AMM 操作的交易历史。",
    historyEndpoints: [
      { endpoint: "POST /get-pool-swap-history", desc: "池交换历史" },
      { endpoint: "POST /get-token-swap-history", desc: "代币交换历史" },
      { endpoint: "POST /get-pool-mint-history", desc: "添加流动性记录" },
      { endpoint: "POST /get-pool-burn-history", desc: "移除流动性记录" }
    ],
    priceTitle: "比特币价格",
    priceDesc: "来自 Uniswap V3 WBTC/USDC 池的实时 BTC 价格。",
    priceEndpoints: [
      { endpoint: "POST /get-bitcoin-price", desc: "当前 BTC 美元价格" },
      { endpoint: "POST /get-bitcoin-market-chart", desc: "历史价格数据" },
      { endpoint: "POST /get-bitcoin-market-weekly", desc: "52 周最高/最低" }
    ],
    healthTitle: "健康检查",
    exampleTitle: "JavaScript 示例"
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

function EndpointTable({ endpoints }: { endpoints: { endpoint: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[color:var(--sf-outline)]">
            <th className="text-left py-2 px-3">Endpoint</th>
            <th className="text-left py-2 px-3">Description</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((e, i) => (
            <tr key={i} className="border-b border-[color:var(--sf-outline)]">
              <td className="py-2 px-3 font-mono text-xs">{e.endpoint}</td>
              <td className="py-2 px-3 text-[color:var(--sf-muted)]">{e.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RestOverviewPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.baseUrlsTitle}</h2>
        <p className="mb-4">{t.baseUrlsDesc}</p>
        <div className="space-y-2">
          {t.networks.map((n, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="font-medium">{n.name}:</span>
              <code className="text-sm bg-[color:var(--sf-surface)] px-2 py-1 rounded">{n.url}</code>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.authTitle}</h2>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.authMethods.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.requestFormatTitle}</h2>
        <p className="mb-4">{t.requestFormatDesc}</p>
        <CodeBlock>{`curl -X POST https://mainnet.subfrost.io/v4/api/get-bitcoin-price \\
  -H "Content-Type: application/json" \\
  -d '{}'

# Or with API key:
curl -X POST https://mainnet.subfrost.io/v4/YOUR_API_KEY/get-bitcoin-price \\
  -H "Content-Type: application/json" \\
  -d '{}'`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.responseFormatTitle}</h2>
        <p className="mb-4">{t.responseFormatDesc}</p>
        <CodeBlock>{`// Success
{
  "statusCode": 200,
  "data": { /* response data */ }
}

// Error
{
  "statusCode": 400,
  "error": "Invalid request parameters"
}`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.endpointCategoriesTitle}</h2>

        <h3 className="text-xl font-semibold mb-2">{t.alkanesTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-2">{t.alkanesDesc}</p>
        <EndpointTable endpoints={t.alkanesEndpoints} />

        <h3 className="text-xl font-semibold mb-2">{t.poolsTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-2">{t.poolsDesc}</p>
        <EndpointTable endpoints={t.poolsEndpoints} />

        <h3 className="text-xl font-semibold mb-2">{t.bitcoinTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-2">{t.bitcoinDesc}</p>
        <EndpointTable endpoints={t.bitcoinEndpoints} />

        <h3 className="text-xl font-semibold mb-2">{t.historyTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-2">{t.historyDesc}</p>
        <EndpointTable endpoints={t.historyEndpoints} />

        <h3 className="text-xl font-semibold mb-2">{t.priceTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-2">{t.priceDesc}</p>
        <EndpointTable endpoints={t.priceEndpoints} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.healthTitle}</h2>
        <CodeBlock>{`GET https://mainnet.subfrost.io/v4/api/health

// Response:
{
  "status": "ok",
  "timestamp": 1699123456
}`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.exampleTitle}</h2>
        <CodeBlock>{`const API_BASE = 'https://mainnet.subfrost.io/v4/api';

async function getAlkanesByAddress(address) {
  const response = await fetch(\`\${API_BASE}/get-alkanes-by-address\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });

  const data = await response.json();

  if (data.statusCode !== 200) {
    throw new Error(data.error);
  }

  return data.data;
}

const alkanes = await getAlkanesByAddress('bc1p...');
console.log('Alkane holdings:', alkanes);`}</CodeBlock>
      </div>
    </div>
  );
}
