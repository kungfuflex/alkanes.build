"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const content = {
  en: {
    title: "@alkanes/ts-sdk Guide",
    subtitle: "Working examples from the alkanes.build codebase",
    intro: "This guide documents how alkanes.build uses the @alkanes/ts-sdk to fetch blockchain data, execute Lua scripts, and build a complete DeFi dashboard. All examples are from working production code.",

    installTitle: "Installation",
    installDesc: "Install the SDK via npm or pnpm:",

    architectureTitle: "Architecture Overview",
    architectureDesc: "The SDK provides a unified TypeScript interface over WASM bindings. See the full API Reference for complete method documentation.",
    architectureItems: [
      { name: "AlkanesProvider", desc: "Main entry point with sub-clients for each API", anchor: "AlkanesProvider" },
      { name: "EsploraClient", desc: "Bitcoin UTXO and transaction data", anchor: "EsploraClient" },
      { name: "AlkanesRpcClient", desc: "Alkane token balances and contract calls", anchor: "AlkanesRpcClient" },
      { name: "MetashrewClient", desc: "Low-level metashrew_view RPC access", anchor: "MetashrewClient" },
      { name: "LuaClient", desc: "Server-side Lua script execution with caching", anchor: "LuaClient" },
      { name: "DataApiClient", desc: "Market data, candles, and BTC price", anchor: "DataApiClient" },
      { name: "BitcoinRpcClient", desc: "Bitcoin Core RPC methods", anchor: "BitcoinRpcClient" }
    ],
    apiRefLink: "View Complete API Reference",

    providerTitle: "Creating the Provider",
    providerDesc: "The AlkanesProvider is the main entry point. Here's how alkanes.build initializes it:",

    clientTitle: "Singleton Client Pattern",
    clientDesc: "We use a singleton pattern for the provider to avoid repeated WASM initialization:",

    heightTitle: "Getting Block Height",
    heightDesc: "Fetch the current blockchain height using the provider:",

    balancesTitle: "Fetching Wallet Balances",
    balancesDesc: "Get BTC balance and Alkane token holdings for an address:",

    btcPriceTitle: "Fetching Bitcoin Price",
    btcPriceDesc: "Get the current BTC/USD price from the Data API:",

    metashrewTitle: "Metashrew View Calls",
    metashrewDesc: "Call alkane contracts using metashrew_view for pool reserves and token data:",

    luaTitle: "Lua Script Execution",
    luaDesc: "Execute Lua scripts for batched queries with automatic scripthash caching:",
    luaAdvantages: [
      "Single RPC round-trip for multiple queries",
      "Atomic data snapshot at the same block height",
      "Automatic scripthash caching (lua_evalsaved fallback)",
      "Server-side JSON encoding"
    ],

    candleTitle: "Fetching Pool Candle Data",
    candleDesc: "Complete example of fetching historical pool data for charts:",

    testingTitle: "Integration Testing",
    testingDesc: "Our integration tests verify the SDK works correctly against live RPC:",

    troubleshootTitle: "Troubleshooting",
    troubleshootItems: [
      { issue: "WASM not loading in Node.js", solution: "Ensure you call provider.initialize() before using any methods. The SDK handles cross-platform WASM loading automatically." },
      { issue: "Empty responses from Lua scripts", solution: "Check that your Lua script returns a value. The SDK uses JSON.parse internally to deserialize the response." },
      { issue: "RPC timeout errors", solution: "Lua scripts that make many RPC calls may timeout. Reduce the number of block heights queried or increase the interval." }
    ],

    resourcesTitle: "Resources",
    resources: [
      { text: "alkanes-rs GitHub", href: "https://github.com/kungfuflex/alkanes-rs", desc: "Alkanes protocol and SDK source" },
      { text: "Live Integration Tests", href: "https://github.com/alkanes-rs/alkanes-rs/tree/develop/ts-sdk", desc: "TS SDK test examples" },
      { text: "Subfrost API", href: "https://api.subfrost.io", desc: "Get API keys for production use" }
    ]
  },
  zh: {
    title: "@alkanes/ts-sdk 指南",
    subtitle: "来自 alkanes.build 代码库的工作示例",
    intro: "本指南记录了 alkanes.build 如何使用 @alkanes/ts-sdk 获取区块链数据、执行 Lua 脚本并构建完整的 DeFi 仪表板。所有示例均来自工作生产代码。",

    installTitle: "安装",
    installDesc: "通过 npm 或 pnpm 安装 SDK：",

    architectureTitle: "架构概述",
    architectureDesc: "SDK 在 WASM 绑定上提供统一的 TypeScript 接口。查看完整的 API 参考以获取详细的方法文档。",
    architectureItems: [
      { name: "AlkanesProvider", desc: "主入口点，包含每个 API 的子客户端", anchor: "AlkanesProvider" },
      { name: "EsploraClient", desc: "比特币 UTXO 和交易数据", anchor: "EsploraClient" },
      { name: "AlkanesRpcClient", desc: "Alkane 代币余额和合约调用", anchor: "AlkanesRpcClient" },
      { name: "MetashrewClient", desc: "低级 metashrew_view RPC 访问", anchor: "MetashrewClient" },
      { name: "LuaClient", desc: "带缓存的服务器端 Lua 脚本执行", anchor: "LuaClient" },
      { name: "DataApiClient", desc: "市场数据、K线和 BTC 价格", anchor: "DataApiClient" },
      { name: "BitcoinRpcClient", desc: "Bitcoin Core RPC 方法", anchor: "BitcoinRpcClient" }
    ],
    apiRefLink: "查看完整 API 参考",

    providerTitle: "创建 Provider",
    providerDesc: "AlkanesProvider 是主入口点。以下是 alkanes.build 初始化它的方式：",

    clientTitle: "单例客户端模式",
    clientDesc: "我们使用单例模式来避免重复的 WASM 初始化：",

    heightTitle: "获取区块高度",
    heightDesc: "使用 provider 获取当前区块链高度：",

    balancesTitle: "获取钱包余额",
    balancesDesc: "获取地址的 BTC 余额和 Alkane 代币持有量：",

    btcPriceTitle: "获取比特币价格",
    btcPriceDesc: "从 Data API 获取当前 BTC/USD 价格：",

    metashrewTitle: "Metashrew View 调用",
    metashrewDesc: "使用 metashrew_view 调用 alkane 合约获取池储备和代币数据：",

    luaTitle: "Lua 脚本执行",
    luaDesc: "执行 Lua 脚本进行批量查询，自动进行脚本哈希缓存：",
    luaAdvantages: [
      "多个查询单次 RPC 往返",
      "同一区块高度的原子数据快照",
      "自动脚本哈希缓存（lua_evalsaved 回退）",
      "服务器端 JSON 编码"
    ],

    candleTitle: "获取池K线数据",
    candleDesc: "获取图表历史池数据的完整示例：",

    testingTitle: "集成测试",
    testingDesc: "我们的集成测试验证 SDK 是否针对实时 RPC 正常工作：",

    troubleshootTitle: "故障排除",
    troubleshootItems: [
      { issue: "WASM 在 Node.js 中未加载", solution: "确保在使用任何方法之前调用 provider.initialize()。SDK 会自动处理跨平台 WASM 加载。" },
      { issue: "Lua 脚本响应为空", solution: "检查您的 Lua 脚本是否返回值。SDK 内部使用 JSON.parse 来反序列化响应。" },
      { issue: "RPC 超时错误", solution: "进行多次 RPC 调用的 Lua 脚本可能会超时。减少查询的区块高度数量或增加间隔。" }
    ],

    resourcesTitle: "资源",
    resources: [
      { text: "alkanes-rs GitHub", href: "https://github.com/kungfuflex/alkanes-rs", desc: "Alkanes 协议和 SDK 源代码" },
      { text: "实时集成测试", href: "https://github.com/alkanes-rs/alkanes-rs/tree/develop/ts-sdk", desc: "TS SDK 测试示例" },
      { text: "Subfrost API", href: "https://api.subfrost.io", desc: "获取生产环境 API 密钥" }
    ]
  }
};

function CodeBlock({ children, title, language = "typescript" }: { children: string; title?: string; language?: string }) {
  return (
    <div className="my-4">
      {title && <div className="text-xs text-[color:var(--sf-muted)] mb-1 font-mono">{title}</div>}
      <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm">
        <code className={`language-${language}`}>{children}</code>
      </pre>
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <div className="mt-10" id={id}>
      <h2 className="text-2xl font-semibold mb-4 text-[color:var(--sf-text)]">{title}</h2>
      {children}
    </div>
  );
}

export default function TsSdkGuidePage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.subtitle}</p>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      {/* Installation */}
      <Section title={t.installTitle} id="installation">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.installDesc}</p>
        <CodeBlock language="bash">{`# npm
npm install @alkanes/ts-sdk

# pnpm
pnpm add @alkanes/ts-sdk`}</CodeBlock>
      </Section>

      {/* Architecture */}
      <Section title={t.architectureTitle} id="architecture">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.architectureDesc}</p>
        <CodeBlock>{`// SDK Structure
import { AlkanesProvider } from '@alkanes/ts-sdk';

const provider = new AlkanesProvider({ network: 'mainnet' });
await provider.initialize();

// Sub-clients available after initialization:
provider.esplora      // EsploraClient - UTXOs, transactions
provider.alkanes      // AlkanesRpcClient - token balances, contract calls
provider.metashrew    // MetashrewClient - low-level metashrew_view
provider.lua          // LuaClient - Lua script execution
provider.dataApi      // DataApiClient - market data, BTC price
provider.bitcoin      // BitcoinRpcClient - bitcoind RPC calls`}</CodeBlock>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)] mt-4">
          {t.architectureItems.map((item, i) => (
            <li key={i}>
              <Link
                href={`/docs/api/ts-sdk#${item.anchor}`}
                className="text-[color:var(--sf-primary)] hover:underline font-mono"
              >
                {item.name}
              </Link>
              <span> - {item.desc}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Link
            href="/docs/api/ts-sdk"
            className="inline-flex items-center gap-2 text-[color:var(--sf-primary)] hover:underline font-medium"
          >
            {t.apiRefLink} →
          </Link>
        </div>
      </Section>

      {/* Provider Setup */}
      <Section title={t.providerTitle} id="provider">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.providerDesc}</p>
        <CodeBlock title="lib/alkanes-client.ts">{`import { AlkanesProvider } from '@alkanes/ts-sdk';

// Network presets available: 'mainnet', 'testnet', 'signet', 'regtest'
const provider = new AlkanesProvider({
  network: 'mainnet',
  // Optional: Override RPC URL
  rpcUrl: process.env.ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/jsonrpc',
});

// IMPORTANT: Must call initialize() before using the provider
// This loads the WASM module (works in both Node.js and browser)
await provider.initialize();`}</CodeBlock>
      </Section>

      {/* Singleton Pattern */}
      <Section title={t.clientTitle} id="singleton">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.clientDesc}</p>
        <CodeBlock title="lib/alkanes-client.ts (singleton pattern)">{`class AlkanesClient {
  private provider: AlkanesProvider | null = null;
  private initPromise: Promise<void> | null = null;
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = process.env.ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/jsonrpc';
  }

  // Lazy, singleton initialization
  private async ensureProvider(): Promise<AlkanesProvider> {
    if (this.provider) return this.provider;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        this.provider = new AlkanesProvider({
          network: 'mainnet',
          rpcUrl: this.rpcUrl,
        });
        await this.provider.initialize();
      })();
    }

    await this.initPromise;
    return this.provider!;
  }

  // Example method using the provider
  async getCurrentHeight(): Promise<number> {
    const provider = await this.ensureProvider();
    return provider.getBlockHeight();
  }
}

// Export singleton instance
export const alkanesClient = new AlkanesClient();`}</CodeBlock>
      </Section>

      {/* Block Height */}
      <Section title={t.heightTitle} id="height">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.heightDesc}</p>
        <CodeBlock title="Getting current block height">{`// Using the convenience method
const height = await provider.getBlockHeight();
console.log('Current height:', height); // e.g., 927618

// Or using the metashrew client directly
const height = await provider.metashrew.getHeight();`}</CodeBlock>
      </Section>

      {/* Wallet Balances */}
      <Section title={t.balancesTitle} id="balances">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.balancesDesc}</p>
        <CodeBlock title="Fetching wallet balances">{`// Get BTC UTXOs
const utxos = await provider.esplora.getAddressUtxos(address);
const btcBalance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
console.log('BTC Balance:', btcBalance, 'sats');

// Get Alkane token balances
const balances = await provider.alkanes.getBalance(address);
console.log('Token balances:', balances);
// Returns: [{ alkane_id: { block: 2, tx: 0 }, balance: 444121520576, ... }]

// Format balances with known token metadata
const KNOWN_TOKENS = {
  '2:0': { symbol: 'DIESEL', decimals: 8 },
  '32:0': { symbol: 'frBTC', decimals: 8 },
  '2:56801': { symbol: 'bUSD', decimals: 8 },
};

for (const b of balances) {
  const id = \`\${b.alkane_id.block}:\${b.alkane_id.tx}\`;
  const token = KNOWN_TOKENS[id] || { symbol: id, decimals: 8 };
  const formatted = Number(b.balance) / Math.pow(10, token.decimals);
  console.log(\`\${token.symbol}: \${formatted.toLocaleString()}\`);
}`}</CodeBlock>
      </Section>

      {/* BTC Price */}
      <Section title={t.btcPriceTitle} id="btc-price">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.btcPriceDesc}</p>
        <CodeBlock title="Fetching Bitcoin price">{`// Using the Data API client
const result = await provider.dataApi.getBitcoinPrice();

// Response structure varies, handle multiple formats:
const price = result?.data?.bitcoin?.usd
           ?? result?.bitcoin?.usd
           ?? result?.price
           ?? result?.usd;

if (typeof price === 'number' && price > 0) {
  console.log('BTC Price:', '$' + price.toLocaleString());
}`}</CodeBlock>
      </Section>

      {/* Metashrew View */}
      <Section title={t.metashrewTitle} id="metashrew">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.metashrewDesc}</p>
        <CodeBlock title="Fetching pool reserves via metashrew_view">{`// Pool configurations with protobuf payloads
const POOLS = {
  DIESEL_FRBTC: {
    name: 'DIESEL/frBTC',
    protobufPayload: '0x2096ce382a06029fda04e7073001',
    alkaneId: { block: 2, tx: 77087 },
  },
  DIESEL_BUSD: {
    name: 'DIESEL/bUSD',
    protobufPayload: '0x2096ce382a0602d99604e7073001',
    alkaneId: { block: 2, tx: 68441 },
  },
};

// Call metashrew_view with 'simulate' view function
const hex = await provider.metashrew.view(
  'simulate',
  POOLS.DIESEL_FRBTC.protobufPayload,
  'latest'  // or a specific block height as string
);

// Parse the response (little-endian u128 values)
function parsePoolReserves(hex: string) {
  const data = hex.startsWith('0x') ? hex.slice(2) : hex;
  // Find inner data after protobuf wrapper
  const marker = data.indexOf('1a');
  if (marker === -1) return null;

  const lenByte = parseInt(data.slice(marker + 2, marker + 4), 16);
  const innerStart = marker + (lenByte < 128 ? 4 : 6);
  const inner = data.slice(innerStart);

  // Pool layout: token_a[32], token_b[32], reserve_a[16], reserve_b[16], total_supply[16]
  return {
    reserve0: parseU128LE(inner, 64),
    reserve1: parseU128LE(inner, 80),
    totalSupply: parseU128LE(inner, 96),
  };
}

// Helper: parse little-endian u128
function parseU128LE(hex: string, byteOffset: number): bigint {
  const slice = hex.slice(byteOffset * 2, byteOffset * 2 + 32);
  let reversed = '';
  for (let i = slice.length - 2; i >= 0; i -= 2) {
    reversed += slice.slice(i, i + 2);
  }
  return BigInt('0x' + (reversed || '0'));
}`}</CodeBlock>
      </Section>

      {/* Lua Scripts */}
      <Section title={t.luaTitle} id="lua">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.luaDesc}</p>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)] mb-4">
          {t.luaAdvantages.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <CodeBlock title="Executing Lua scripts with provider.lua.eval()">{`// The LuaClient automatically handles scripthash caching:
// 1. Computes SHA256 hash of script
// 2. Tries lua_evalsaved (cached) first
// 3. Falls back to lua_evalscript if not cached

const STATS_LUA_SCRIPT = \`
-- Fetch DIESEL stats in a single RPC call
local results = { diesel = {}, pools = {}, height = 0 }

-- Get current height
results.height = tonumber(_RPC.metashrew_height()) or 0

-- Fetch DIESEL total supply (opcode 101)
local diesel_response = _RPC.metashrew_view(
    "simulate",
    "0x20e3ce382a030200653001",
    "latest"
)
if diesel_response then
    results.diesel.total_supply = parse_total_supply(diesel_response)
end

-- Fetch pool reserves
local frbtc_response = _RPC.metashrew_view(
    "simulate",
    "0x2096ce382a06029fda04e7073001",
    "latest"
)
-- Parse and add to results...

return results
\`;

// Execute the script
const result = await provider.lua.eval(STATS_LUA_SCRIPT, []);

// Result structure: { calls: number, returns: any, runtime: number }
console.log('RPC calls made:', result.calls);
console.log('Runtime (ms):', result.runtime);
console.log('Data:', result.returns);`}</CodeBlock>
      </Section>

      {/* Candle Data */}
      <Section title={t.candleTitle} id="candles">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.candleDesc}</p>
        <CodeBlock title="lib/pools/candle-fetcher.ts">{`// Lua script for fetching historical pool data
export const CANDLES_LUA_SCRIPT = \`
local params = args[1] or {}
local pool_payload = params[1]
local start_height = tonumber(params[2])
local end_height = tonumber(params[3])
local interval = tonumber(params[4]) or 144  -- ~1 day in blocks

local function parse_u128_le(hex_str, byte_offset)
    -- Little-endian u128 parsing
    local hex_offset = byte_offset * 2
    local hex_slice = hex_str:sub(hex_offset + 1, hex_offset + 32)
    local reversed = ""
    for i = #hex_slice - 1, 1, -2 do
        reversed = reversed .. hex_slice:sub(i, i + 1)
    end
    return tonumber(reversed, 16) or 0
end

local function get_block_timestamp(height)
    local ok, hash = pcall(function() return _RPC.btc_getblockhash(height) end)
    if not ok then return nil end
    local ok2, block = pcall(function() return _RPC.btc_getblock(hash, 1) end)
    if not ok2 then return nil end
    return block.time
end

local results = { data_points = {} }

for height = start_height, end_height, interval do
    local ok, response = pcall(function()
        return _RPC.metashrew_view("simulate", pool_payload, tostring(height))
    end)

    if ok and response then
        local hex = response:sub(1, 2) == "0x" and response:sub(3) or response
        -- Parse reserves from response...
        table.insert(results.data_points, {
            height = height,
            timestamp = get_block_timestamp(height),
            reserve_a = parse_u128_le(inner, 64),
            reserve_b = parse_u128_le(inner, 80),
            total_supply = parse_u128_le(inner, 96)
        })
    end
end

results.count = #results.data_points
return results
\`;

// Execute and process results
export async function fetchPoolDataPoints(
  poolKey: 'DIESEL_FRBTC' | 'DIESEL_BUSD',
  startHeight: number,
  endHeight: number,
  interval: number = 144
) {
  const pool = POOLS[poolKey];
  const provider = await ensureProvider();

  const result = await provider.lua.eval(CANDLES_LUA_SCRIPT, [
    [pool.protobufPayload, startHeight.toString(), endHeight.toString(), interval.toString()]
  ]);

  // Convert to typed data points
  return result.returns.data_points.map(dp => ({
    height: dp.height,
    timestamp: dp.timestamp,
    reserve0: BigInt(dp.reserve_a),
    reserve1: BigInt(dp.reserve_b),
    totalSupply: BigInt(dp.total_supply),
  }));
}`}</CodeBlock>
      </Section>

      {/* Testing */}
      <Section title={t.testingTitle} id="testing">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.testingDesc}</p>
        <CodeBlock title="tests/integration/live-rpc.test.ts">{`import { describe, it, expect } from "vitest";
import { AlkanesProvider } from "@alkanes/ts-sdk";

const TEST_ADDRESS = "bc1puvfmy5whzdq35nd2trckkm09em9u7ps6lal564jz92c9feswwrpsr7ach5";

describe("Live SDK Integration", () => {
  it("should fetch wallet balances", async () => {
    const provider = new AlkanesProvider({
      network: "mainnet",
      rpcUrl: "https://mainnet.subfrost.io/v4/jsonrpc"
    });
    await provider.initialize();

    // Get UTXOs
    const utxos = await provider.esplora.getAddressUtxos(TEST_ADDRESS);
    expect(Array.isArray(utxos)).toBe(true);
    expect(utxos.length).toBeGreaterThan(0);

    // Get alkane balances
    const balances = await provider.alkanes.getBalance(TEST_ADDRESS);
    expect(balances).toBeDefined();
    console.log('Found', balances.length, 'token balances');
  }, 60000);

  it("should execute Lua scripts", async () => {
    const provider = new AlkanesProvider({ network: "mainnet" });
    await provider.initialize();

    const result = await provider.lua.eval(\`
      local height = tonumber(_RPC.metashrew_height()) or 0
      return { height = height }
    \`, []);

    expect(result.returns.height).toBeGreaterThan(900000);
  }, 60000);
});

// Run with: RUN_INTEGRATION=true pnpm vitest run tests/integration/`}</CodeBlock>
      </Section>

      {/* Troubleshooting */}
      <Section title={t.troubleshootTitle} id="troubleshooting">
        <div className="space-y-4">
          {t.troubleshootItems.map((item, i) => (
            <div key={i} className="p-4 rounded-lg border border-[color:var(--sf-outline)] bg-[color:var(--sf-surface)]">
              <h4 className="font-semibold mb-2 text-[color:var(--sf-text)]">{item.issue}</h4>
              <p className="text-sm text-[color:var(--sf-muted)]">{item.solution}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Resources */}
      <Section title={t.resourcesTitle} id="resources">
        <ul className="space-y-3">
          {t.resources.map((resource, i) => (
            <li key={i}>
              <a
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--sf-primary)] hover:underline font-medium"
              >
                {resource.text}
              </a>
              <span className="text-[color:var(--sf-muted)]"> - {resource.desc}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
