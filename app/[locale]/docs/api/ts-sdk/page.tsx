"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const content = {
  en: {
    title: "@alkanes/ts-sdk API Reference",
    subtitle: "Complete TypeScript SDK reference for the Alkanes protocol",
    intro: "The @alkanes/ts-sdk provides a unified TypeScript interface for interacting with the Alkanes protocol. This page documents all available classes and their methods.",

    tocTitle: "Table of Contents",

    providerTitle: "AlkanesProvider",
    providerDesc: "The main entry point for all SDK functionality. Provides access to all sub-clients after initialization.",
    providerUsage: "Basic usage:",
    providerProperties: "Properties",
    providerMethods: "Methods",

    esploraTitle: "EsploraClient",
    esploraDesc: "Client for Esplora-compatible Bitcoin block explorer API. Provides UTXO data, transaction information, and address balances.",
    esploraAccess: "Accessed via provider.esplora",

    alkanesTitle: "AlkanesRpcClient",
    alkanesDesc: "Client for Alkanes-specific RPC methods. Handles token balances, contract simulation, and protocol operations.",
    alkanesAccess: "Accessed via provider.alkanes",

    metashrewTitle: "MetashrewClient",
    metashrewDesc: "Low-level client for metashrew_view RPC calls. Provides direct access to indexer state queries.",
    metashrewAccess: "Accessed via provider.metashrew",

    luaTitle: "LuaClient",
    luaDesc: "Client for executing Lua scripts on the server. Supports automatic scripthash caching for improved performance.",
    luaAccess: "Accessed via provider.lua",

    dataApiTitle: "DataApiClient",
    dataApiDesc: "Client for the Data API endpoints. Provides market data, pool information, candles, and holder statistics.",
    dataApiAccess: "Accessed via provider.dataApi",

    bitcoinTitle: "BitcoinRpcClient",
    bitcoinDesc: "Client for Bitcoin Core RPC methods. Provides block data, transaction broadcasting, and network information.",
    bitcoinAccess: "Accessed via provider.bitcoin",

    typesTitle: "Types",
    typesDesc: "Common types used throughout the SDK.",

    parametersLabel: "Parameters:",
    returnsLabel: "Returns:",
    exampleLabel: "Example:",
  },
  zh: {
    title: "@alkanes/ts-sdk API 参考",
    subtitle: "Alkanes 协议的完整 TypeScript SDK 参考",
    intro: "@alkanes/ts-sdk 提供了统一的 TypeScript 接口来与 Alkanes 协议交互。本页记录了所有可用的类和方法。",

    tocTitle: "目录",

    providerTitle: "AlkanesProvider",
    providerDesc: "所有 SDK 功能的主入口点。初始化后提供对所有子客户端的访问。",
    providerUsage: "基本用法：",
    providerProperties: "属性",
    providerMethods: "方法",

    esploraTitle: "EsploraClient",
    esploraDesc: "用于 Esplora 兼容的比特币区块浏览器 API 的客户端。提供 UTXO 数据、交易信息和地址余额。",
    esploraAccess: "通过 provider.esplora 访问",

    alkanesTitle: "AlkanesRpcClient",
    alkanesDesc: "用于 Alkanes 特定 RPC 方法的客户端。处理代币余额、合约模拟和协议操作。",
    alkanesAccess: "通过 provider.alkanes 访问",

    metashrewTitle: "MetashrewClient",
    metashrewDesc: "用于 metashrew_view RPC 调用的低级客户端。提供对索引器状态查询的直接访问。",
    metashrewAccess: "通过 provider.metashrew 访问",

    luaTitle: "LuaClient",
    luaDesc: "用于在服务器上执行 Lua 脚本的客户端。支持自动脚本哈希缓存以提高性能。",
    luaAccess: "通过 provider.lua 访问",

    dataApiTitle: "DataApiClient",
    dataApiDesc: "用于 Data API 端点的客户端。提供市场数据、池信息、K线和持有者统计。",
    dataApiAccess: "通过 provider.dataApi 访问",

    bitcoinTitle: "BitcoinRpcClient",
    bitcoinDesc: "用于 Bitcoin Core RPC 方法的客户端。提供区块数据、交易广播和网络信息。",
    bitcoinAccess: "通过 provider.bitcoin 访问",

    typesTitle: "类型",
    typesDesc: "SDK 中使用的通用类型。",

    parametersLabel: "参数：",
    returnsLabel: "返回：",
    exampleLabel: "示例：",
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

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <div className="mt-12 scroll-mt-24" id={id}>
      <h2 className="text-2xl font-semibold mb-4 text-[color:var(--sf-text)]">{title}</h2>
      {children}
    </div>
  );
}

function MethodDoc({
  name,
  signature,
  description,
  params,
  returns,
  example,
  t
}: {
  name: string;
  signature: string;
  description: string;
  params?: { name: string; type: string; desc: string }[];
  returns: string;
  example?: string;
  t: typeof content.en;
}) {
  return (
    <div className="mb-6 p-4 rounded-lg border border-[color:var(--sf-outline)] bg-[color:var(--sf-background)]">
      <h4 className="font-mono text-[color:var(--sf-primary)] font-semibold mb-2">{name}()</h4>
      <CodeBlock>{signature}</CodeBlock>
      <p className="text-[color:var(--sf-muted)] text-sm mb-3">{description}</p>
      {params && params.length > 0 && (
        <div className="mb-3">
          <span className="text-sm font-semibold text-[color:var(--sf-text)]">{t.parametersLabel}</span>
          <ul className="list-disc list-inside text-sm text-[color:var(--sf-muted)] mt-1 space-y-1">
            {params.map((p, i) => (
              <li key={i}>
                <code className="text-[color:var(--sf-primary)]">{p.name}</code>
                <span className="text-[color:var(--sf-muted)]"> ({p.type})</span>
                <span> - {p.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-3">
        <span className="text-sm font-semibold text-[color:var(--sf-text)]">{t.returnsLabel}</span>
        <span className="text-sm text-[color:var(--sf-muted)]"> {returns}</span>
      </div>
      {example && (
        <div>
          <span className="text-sm font-semibold text-[color:var(--sf-text)]">{t.exampleLabel}</span>
          <CodeBlock>{example}</CodeBlock>
        </div>
      )}
    </div>
  );
}

function TocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block py-1 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors"
    >
      {children}
    </a>
  );
}

export default function TsSdkApiPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.subtitle}</p>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      {/* Table of Contents */}
      <div className="p-4 rounded-lg border border-[color:var(--sf-outline)] bg-[color:var(--sf-surface)]">
        <h3 className="font-semibold text-[color:var(--sf-text)] mb-3">{t.tocTitle}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <TocLink href="#AlkanesProvider">AlkanesProvider</TocLink>
          <TocLink href="#EsploraClient">EsploraClient</TocLink>
          <TocLink href="#AlkanesRpcClient">AlkanesRpcClient</TocLink>
          <TocLink href="#MetashrewClient">MetashrewClient</TocLink>
          <TocLink href="#LuaClient">LuaClient</TocLink>
          <TocLink href="#DataApiClient">DataApiClient</TocLink>
          <TocLink href="#BitcoinRpcClient">BitcoinRpcClient</TocLink>
          <TocLink href="#Types">Types</TocLink>
        </div>
      </div>

      {/* AlkanesProvider */}
      <Section title={t.providerTitle} id="AlkanesProvider">
        <p className="text-[color:var(--sf-muted)] mb-4">{t.providerDesc}</p>
        <CodeBlock title={t.providerUsage}>{`import { AlkanesProvider } from '@alkanes/ts-sdk';

const provider = new AlkanesProvider({
  network: 'mainnet',           // 'mainnet' | 'testnet' | 'signet' | 'regtest' | 'local'
  rpcUrl?: string,              // Optional: Override RPC URL
  dataApiUrl?: string,          // Optional: Override Data API URL
  bitcoinNetwork?: Network,     // Optional: Custom bitcoinjs-lib network
});

// IMPORTANT: Must initialize before using
await provider.initialize();

// Access sub-clients
provider.esplora      // EsploraClient
provider.alkanes      // AlkanesRpcClient
provider.metashrew    // MetashrewClient
provider.lua          // LuaClient
provider.dataApi      // DataApiClient
provider.bitcoin      // BitcoinRpcClient`}</CodeBlock>

        <h4 className="font-semibold text-[color:var(--sf-text)] mt-6 mb-3">{t.providerProperties}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-[color:var(--sf-outline)]">
            <thead className="bg-[color:var(--sf-surface)]">
              <tr>
                <th className="text-left p-3 border-b border-[color:var(--sf-outline)]">Property</th>
                <th className="text-left p-3 border-b border-[color:var(--sf-outline)]">Type</th>
                <th className="text-left p-3 border-b border-[color:var(--sf-outline)]">Description</th>
              </tr>
            </thead>
            <tbody className="text-[color:var(--sf-muted)]">
              <tr><td className="p-3 border-b border-[color:var(--sf-outline)]"><code>rpcUrl</code></td><td className="p-3 border-b border-[color:var(--sf-outline)]">string</td><td className="p-3 border-b border-[color:var(--sf-outline)]">The JSON-RPC endpoint URL</td></tr>
              <tr><td className="p-3 border-b border-[color:var(--sf-outline)]"><code>dataApiUrl</code></td><td className="p-3 border-b border-[color:var(--sf-outline)]">string</td><td className="p-3 border-b border-[color:var(--sf-outline)]">The Data API endpoint URL</td></tr>
              <tr><td className="p-3 border-b border-[color:var(--sf-outline)]"><code>network</code></td><td className="p-3 border-b border-[color:var(--sf-outline)]">Network</td><td className="p-3 border-b border-[color:var(--sf-outline)]">bitcoinjs-lib network object</td></tr>
              <tr><td className="p-3 border-b border-[color:var(--sf-outline)]"><code>networkType</code></td><td className="p-3 border-b border-[color:var(--sf-outline)]">string</td><td className="p-3 border-b border-[color:var(--sf-outline)]">Network type: mainnet, testnet, signet, regtest</td></tr>
              <tr><td className="p-3"><code>networkPreset</code></td><td className="p-3">string</td><td className="p-3">The network preset name used</td></tr>
            </tbody>
          </table>
        </div>

        <h4 className="font-semibold text-[color:var(--sf-text)] mt-6 mb-3">{t.providerMethods}</h4>
        <MethodDoc
          name="initialize"
          signature="async initialize(): Promise<void>"
          description="Initialize the provider by loading the WASM module. Must be called before using any sub-clients."
          returns="Promise<void>"
          example={`const provider = new AlkanesProvider({ network: 'mainnet' });
await provider.initialize();
// Now ready to use`}
          t={t}
        />
        <MethodDoc
          name="getProvider"
          signature="async getProvider(): Promise<WebProvider>"
          description="Get the underlying WASM WebProvider instance. Automatically initializes if needed."
          returns="Promise<WebProvider> - The WASM provider instance"
          t={t}
        />
        <MethodDoc
          name="getBlockHeight"
          signature="async getBlockHeight(): Promise<number>"
          description="Convenience method to get the current blockchain height."
          returns="Promise<number> - Current block height"
          example={`const height = await provider.getBlockHeight();
console.log('Current height:', height); // e.g., 927618`}
          t={t}
        />
      </Section>

      {/* EsploraClient */}
      <Section title={t.esploraTitle} id="EsploraClient">
        <p className="text-[color:var(--sf-muted)] mb-2">{t.esploraDesc}</p>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.esploraAccess}</p>

        <MethodDoc
          name="getAddressUtxos"
          signature="async getAddressUtxos(address: string): Promise<UTXO[]>"
          description="Get all UTXOs for a Bitcoin address. Essential for calculating BTC balance and building transactions."
          params={[{ name: "address", type: "string", desc: "Bitcoin address (any format)" }]}
          returns="Promise<UTXO[]> - Array of unspent transaction outputs"
          example={`const utxos = await provider.esplora.getAddressUtxos('bc1q...');
const balance = utxos.reduce((sum, u) => sum + u.value, 0);
console.log('Balance:', balance, 'sats');`}
          t={t}
        />
        <MethodDoc
          name="getAddressInfo"
          signature="async getAddressInfo(address: string): Promise<AddressInfo>"
          description="Get aggregated address information including transaction count and balances."
          params={[{ name: "address", type: "string", desc: "Bitcoin address" }]}
          returns="Promise<AddressInfo> - Address statistics and balances"
          t={t}
        />
        <MethodDoc
          name="getAddressTxs"
          signature="async getAddressTxs(address: string): Promise<Transaction[]>"
          description="Get transaction history for an address."
          params={[{ name: "address", type: "string", desc: "Bitcoin address" }]}
          returns="Promise<Transaction[]> - Array of transactions"
          t={t}
        />
        <MethodDoc
          name="getTx"
          signature="async getTx(txid: string): Promise<Transaction>"
          description="Get detailed transaction information by txid."
          params={[{ name: "txid", type: "string", desc: "Transaction ID (hex)" }]}
          returns="Promise<Transaction> - Transaction details"
          t={t}
        />
        <MethodDoc
          name="getTxStatus"
          signature="async getTxStatus(txid: string): Promise<TxStatus>"
          description="Get confirmation status of a transaction."
          params={[{ name: "txid", type: "string", desc: "Transaction ID" }]}
          returns="Promise<TxStatus> - Confirmation status and block info"
          t={t}
        />
        <MethodDoc
          name="getTxHex"
          signature="async getTxHex(txid: string): Promise<string>"
          description="Get raw transaction hex."
          params={[{ name: "txid", type: "string", desc: "Transaction ID" }]}
          returns="Promise<string> - Raw transaction hex"
          t={t}
        />
        <MethodDoc
          name="getBlocksTipHeight"
          signature="async getBlocksTipHeight(): Promise<number>"
          description="Get the current blockchain tip height."
          returns="Promise<number> - Current block height"
          t={t}
        />
        <MethodDoc
          name="getBlocksTipHash"
          signature="async getBlocksTipHash(): Promise<string>"
          description="Get the current blockchain tip block hash."
          returns="Promise<string> - Block hash (hex)"
          t={t}
        />
        <MethodDoc
          name="broadcastTx"
          signature="async broadcastTx(txHex: string): Promise<string>"
          description="Broadcast a signed transaction to the network."
          params={[{ name: "txHex", type: "string", desc: "Signed transaction hex" }]}
          returns="Promise<string> - Transaction ID if successful"
          t={t}
        />
      </Section>

      {/* AlkanesRpcClient */}
      <Section title={t.alkanesTitle} id="AlkanesRpcClient">
        <p className="text-[color:var(--sf-muted)] mb-2">{t.alkanesDesc}</p>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.alkanesAccess}</p>

        <MethodDoc
          name="getBalance"
          signature="async getBalance(address: string): Promise<AlkaneBalance[]>"
          description="Get all Alkane token balances for an address. Internally uses the protorunesbyaddress view function."
          params={[{ name: "address", type: "string", desc: "Bitcoin address" }]}
          returns="Promise<AlkaneBalance[]> - Array of token balances"
          example={`const balances = await provider.alkanes.getBalance('bc1q...');
for (const b of balances) {
  const id = \`\${b.alkane_id.block}:\${b.alkane_id.tx}\`;
  console.log(\`\${id}: \${b.balance}\`);
}`}
          t={t}
        />
        <MethodDoc
          name="getByAddress"
          signature="async getByAddress(address: string, blockTag?: string, protocolTag?: number): Promise<OutpointBalances>"
          description="Get detailed balance information by address with outpoint data. Returns balance sheets per UTXO."
          params={[
            { name: "address", type: "string", desc: "Bitcoin address" },
            { name: "blockTag", type: "string", desc: "Block height or 'latest'" },
            { name: "protocolTag", type: "number", desc: "Protocol tag (default: 1 for Alkanes)" },
          ]}
          returns="Promise<OutpointBalances> - Balances organized by outpoint"
          t={t}
        />
        <MethodDoc
          name="getByOutpoint"
          signature="async getByOutpoint(outpoint: Outpoint, blockTag?: string, protocolTag?: number): Promise<BalanceSheet>"
          description="Get balance sheet for a specific UTXO outpoint."
          params={[
            { name: "outpoint", type: "Outpoint", desc: "{ txid: string, vout: number }" },
            { name: "blockTag", type: "string", desc: "Block height or 'latest'" },
            { name: "protocolTag", type: "number", desc: "Protocol tag (default: 1)" },
          ]}
          returns="Promise<BalanceSheet> - Token balances on the outpoint"
          t={t}
        />
        <MethodDoc
          name="getBytecode"
          signature="async getBytecode(alkaneId: AlkaneId, blockTag?: string): Promise<string>"
          description="Get the WASM bytecode of an Alkane contract."
          params={[
            { name: "alkaneId", type: "AlkaneId", desc: "{ block: number, tx: number }" },
            { name: "blockTag", type: "string", desc: "Block height or 'latest'" },
          ]}
          returns="Promise<string> - Contract bytecode (hex)"
          t={t}
        />
        <MethodDoc
          name="simulate"
          signature="async simulate(contractId: AlkaneId, contextJson: string, blockTag?: string): Promise<SimulateResult>"
          description="Simulate a contract call without broadcasting. Used for read operations and gas estimation."
          params={[
            { name: "contractId", type: "AlkaneId", desc: "Target contract ID" },
            { name: "contextJson", type: "string", desc: "JSON-encoded call context" },
            { name: "blockTag", type: "string", desc: "Block height or 'latest'" },
          ]}
          returns="Promise<SimulateResult> - Simulation result with return data"
          example={`// Simulate a pool reserves query
const result = await provider.alkanes.simulate(
  { block: 2, tx: 77087 },
  JSON.stringify({ opcode: 101 }),  // getReserves
  'latest'
);`}
          t={t}
        />
        <MethodDoc
          name="execute"
          signature="async execute(paramsJson: string): Promise<ExecuteResult>"
          description="Build a transaction that executes a contract call."
          params={[{ name: "paramsJson", type: "string", desc: "JSON-encoded execution parameters" }]}
          returns="Promise<ExecuteResult> - Transaction data for signing"
          t={t}
        />
        <MethodDoc
          name="trace"
          signature="async trace(outpoint: Outpoint): Promise<TraceResult>"
          description="Trace the history of tokens on an outpoint."
          params={[{ name: "outpoint", type: "Outpoint", desc: "{ txid: string, vout: number }" }]}
          returns="Promise<TraceResult> - Token transfer history"
          t={t}
        />
        <MethodDoc
          name="view"
          signature="async view(contractId: AlkaneId, viewFn: string, params: unknown[], blockTag?: string): Promise<unknown>"
          description="Call a view function on a contract."
          params={[
            { name: "contractId", type: "AlkaneId", desc: "Target contract ID" },
            { name: "viewFn", type: "string", desc: "View function name" },
            { name: "params", type: "unknown[]", desc: "Function parameters" },
            { name: "blockTag", type: "string", desc: "Block height or 'latest'" },
          ]}
          returns="Promise<unknown> - View function result"
          t={t}
        />
        <MethodDoc
          name="getAllPools"
          signature="async getAllPools(factoryId?: AlkaneId): Promise<AlkaneId[]>"
          description="Get all AMM pools from a factory contract."
          params={[{ name: "factoryId", type: "AlkaneId", desc: "Factory contract ID (optional)" }]}
          returns="Promise<AlkaneId[]> - Array of pool contract IDs"
          t={t}
        />
        <MethodDoc
          name="getAllPoolsWithDetails"
          signature="async getAllPoolsWithDetails(factoryId?: AlkaneId, chunkSize?: number, maxConcurrent?: number): Promise<PoolDetails[]>"
          description="Get all pools with their reserve and token details."
          params={[
            { name: "factoryId", type: "AlkaneId", desc: "Factory contract ID" },
            { name: "chunkSize", type: "number", desc: "Batch size for queries" },
            { name: "maxConcurrent", type: "number", desc: "Max concurrent requests" },
          ]}
          returns="Promise<PoolDetails[]> - Array of pool details with reserves"
          t={t}
        />
        <MethodDoc
          name="getPendingUnwraps"
          signature="async getPendingUnwraps(blockTag?: string): Promise<PendingUnwrap[]>"
          description="Get pending BTC unwrap requests from the frBTC contract."
          params={[{ name: "blockTag", type: "string", desc: "Block height or 'latest'" }]}
          returns="Promise<PendingUnwrap[]> - Array of pending unwrap requests"
          t={t}
        />
      </Section>

      {/* MetashrewClient */}
      <Section title={t.metashrewTitle} id="MetashrewClient">
        <p className="text-[color:var(--sf-muted)] mb-2">{t.metashrewDesc}</p>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.metashrewAccess}</p>

        <MethodDoc
          name="getHeight"
          signature="async getHeight(): Promise<number>"
          description="Get the current indexed blockchain height from the metashrew indexer."
          returns="Promise<number> - Current indexed height"
          example={`const height = await provider.metashrew.getHeight();
console.log('Indexed height:', height);`}
          t={t}
        />
        <MethodDoc
          name="getStateRoot"
          signature="async getStateRoot(height?: number): Promise<string>"
          description="Get the state root hash at a specific height."
          params={[{ name: "height", type: "number", desc: "Block height (optional, defaults to latest)" }]}
          returns="Promise<string> - State root hash (hex)"
          t={t}
        />
        <MethodDoc
          name="getBlockHash"
          signature="async getBlockHash(height: number): Promise<string>"
          description="Get block hash at a specific height."
          params={[{ name: "height", type: "number", desc: "Block height" }]}
          returns="Promise<string> - Block hash (hex)"
          t={t}
        />
        <MethodDoc
          name="view"
          signature="async view(viewFn: string, payload: string, blockTag?: string): Promise<string>"
          description="Execute a metashrew_view call. This is the low-level method for querying indexer state."
          params={[
            { name: "viewFn", type: "string", desc: "View function name (e.g., 'simulate', 'protorunesbyaddress')" },
            { name: "payload", type: "string", desc: "Hex-encoded protobuf payload" },
            { name: "blockTag", type: "string", desc: "Block height or 'latest'" },
          ]}
          returns="Promise<string> - Hex-encoded response"
          example={`// Query pool reserves
const response = await provider.metashrew.view(
  'simulate',
  '0x2096ce382a06029fda04e7073001',  // DIESEL/frBTC pool
  'latest'
);
// Parse the hex response...`}
          t={t}
        />
      </Section>

      {/* LuaClient */}
      <Section title={t.luaTitle} id="LuaClient">
        <p className="text-[color:var(--sf-muted)] mb-2">{t.luaDesc}</p>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.luaAccess}</p>

        <MethodDoc
          name="eval"
          signature="async eval(script: string, args?: unknown[]): Promise<LuaResult>"
          description="Execute a Lua script with automatic scripthash caching. This is the recommended method for Lua execution. It computes the SHA256 hash of the script and tries the cached version first (lua_evalsaved), falling back to full execution (lua_evalscript) if not cached."
          params={[
            { name: "script", type: "string", desc: "Lua script content" },
            { name: "args", type: "unknown[]", desc: "Arguments passed to the script as 'args' global" },
          ]}
          returns="Promise<LuaResult> - { calls: number, returns: any, runtime: number }"
          example={`const result = await provider.lua.eval(\`
  local height = tonumber(_RPC.metashrew_height()) or 0
  local params = args[1] or {}
  return {
    height = height,
    address = params[1]
  }
\`, [['bc1q...']]);

console.log('Height:', result.returns.height);
console.log('RPC calls:', result.calls);
console.log('Runtime:', result.runtime, 'ms');`}
          t={t}
        />
        <MethodDoc
          name="evalScript"
          signature="async evalScript(script: string): Promise<LuaResult>"
          description="Execute a Lua script directly without caching. Use this only when you need to bypass the scripthash cache (e.g., for one-time scripts)."
          params={[{ name: "script", type: "string", desc: "Lua script content" }]}
          returns="Promise<LuaResult> - { calls: number, returns: any, runtime: number }"
          t={t}
        />
      </Section>

      {/* DataApiClient */}
      <Section title={t.dataApiTitle} id="DataApiClient">
        <p className="text-[color:var(--sf-muted)] mb-2">{t.dataApiDesc}</p>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.dataApiAccess}</p>

        <h4 className="font-semibold text-[color:var(--sf-text)] mt-6 mb-3">Market Data</h4>
        <MethodDoc
          name="getBitcoinPrice"
          signature="async getBitcoinPrice(): Promise<BitcoinPrice>"
          description="Get the current Bitcoin price in USD."
          returns="Promise<BitcoinPrice> - { usd: number, ... }"
          example={`const price = await provider.dataApi.getBitcoinPrice();
console.log('BTC Price:', '$' + price.usd.toLocaleString());`}
          t={t}
        />
        <MethodDoc
          name="getBitcoinMarketChart"
          signature="async getBitcoinMarketChart(days: number): Promise<MarketChart>"
          description="Get historical Bitcoin price data."
          params={[{ name: "days", type: "number", desc: "Number of days of history" }]}
          returns="Promise<MarketChart> - Historical price data"
          t={t}
        />

        <h4 className="font-semibold text-[color:var(--sf-text)] mt-6 mb-3">Pool Data</h4>
        <MethodDoc
          name="getPools"
          signature="async getPools(factoryId?: string): Promise<Pool[]>"
          description="Get all pools from the data API."
          params={[{ name: "factoryId", type: "string", desc: "Filter by factory (optional)" }]}
          returns="Promise<Pool[]> - Array of pool data"
          t={t}
        />
        <MethodDoc
          name="getReserves"
          signature="async getReserves(pool: string): Promise<Reserves>"
          description="Get current reserves for a pool."
          params={[{ name: "pool", type: "string", desc: "Pool ID (e.g., '2:77087')" }]}
          returns="Promise<Reserves> - { reserve0: bigint, reserve1: bigint, ... }"
          t={t}
        />
        <MethodDoc
          name="getCandles"
          signature="async getCandles(pool: string, interval: string, startTime: number, endTime: number, limit?: number): Promise<Candle[]>"
          description="Get OHLCV candle data for a pool."
          params={[
            { name: "pool", type: "string", desc: "Pool ID" },
            { name: "interval", type: "string", desc: "Candle interval (e.g., '1h', '1d')" },
            { name: "startTime", type: "number", desc: "Start timestamp (seconds)" },
            { name: "endTime", type: "number", desc: "End timestamp (seconds)" },
            { name: "limit", type: "number", desc: "Max candles to return" },
          ]}
          returns="Promise<Candle[]> - OHLCV data"
          t={t}
        />
        <MethodDoc
          name="getTrades"
          signature="async getTrades(pool: string, startTime?: number, endTime?: number, limit?: number): Promise<Trade[]>"
          description="Get trade history for a pool."
          params={[
            { name: "pool", type: "string", desc: "Pool ID" },
            { name: "startTime", type: "number", desc: "Start timestamp (optional)" },
            { name: "endTime", type: "number", desc: "End timestamp (optional)" },
            { name: "limit", type: "number", desc: "Max trades to return" },
          ]}
          returns="Promise<Trade[]> - Array of trades"
          t={t}
        />

        <h4 className="font-semibold text-[color:var(--sf-text)] mt-6 mb-3">Pool History</h4>
        <MethodDoc
          name="getPoolHistory"
          signature="async getPoolHistory(poolId: string, category: string, limit?: number, offset?: number): Promise<HistoryEntry[]>"
          description="Get pool history by category (swap, mint, burn, all)."
          params={[
            { name: "poolId", type: "string", desc: "Pool ID" },
            { name: "category", type: "string", desc: "'swap' | 'mint' | 'burn' | 'all'" },
            { name: "limit", type: "number", desc: "Max entries" },
            { name: "offset", type: "number", desc: "Pagination offset" },
          ]}
          returns="Promise<HistoryEntry[]> - History entries"
          t={t}
        />
        <MethodDoc
          name="getSwapHistory"
          signature="async getSwapHistory(poolId: string, limit?: number, offset?: number): Promise<SwapEntry[]>"
          description="Get swap history for a pool."
          params={[
            { name: "poolId", type: "string", desc: "Pool ID" },
            { name: "limit", type: "number", desc: "Max entries" },
            { name: "offset", type: "number", desc: "Pagination offset" },
          ]}
          returns="Promise<SwapEntry[]> - Swap entries"
          t={t}
        />
        <MethodDoc
          name="getMintHistory"
          signature="async getMintHistory(poolId: string, limit?: number, offset?: number): Promise<MintEntry[]>"
          description="Get liquidity mint history for a pool."
          params={[
            { name: "poolId", type: "string", desc: "Pool ID" },
            { name: "limit", type: "number", desc: "Max entries" },
            { name: "offset", type: "number", desc: "Pagination offset" },
          ]}
          returns="Promise<MintEntry[]> - Mint entries"
          t={t}
        />
        <MethodDoc
          name="getBurnHistory"
          signature="async getBurnHistory(poolId: string, limit?: number, offset?: number): Promise<BurnEntry[]>"
          description="Get liquidity burn history for a pool."
          params={[
            { name: "poolId", type: "string", desc: "Pool ID" },
            { name: "limit", type: "number", desc: "Max entries" },
            { name: "offset", type: "number", desc: "Pagination offset" },
          ]}
          returns="Promise<BurnEntry[]> - Burn entries"
          t={t}
        />

        <h4 className="font-semibold text-[color:var(--sf-text)] mt-6 mb-3">Balance & Token Data</h4>
        <MethodDoc
          name="getAlkanesByAddress"
          signature="async getAlkanesByAddress(address: string): Promise<AlkaneBalance[]>"
          description="Get Alkane token balances for an address via the Data API."
          params={[{ name: "address", type: "string", desc: "Bitcoin address" }]}
          returns="Promise<AlkaneBalance[]> - Token balances"
          t={t}
        />
        <MethodDoc
          name="getAddressBalances"
          signature="async getAddressBalances(address: string, includeOutpoints?: boolean): Promise<AddressBalances>"
          description="Get comprehensive address balances."
          params={[
            { name: "address", type: "string", desc: "Bitcoin address" },
            { name: "includeOutpoints", type: "boolean", desc: "Include per-UTXO breakdown" },
          ]}
          returns="Promise<AddressBalances> - Balance data"
          t={t}
        />
        <MethodDoc
          name="getHolders"
          signature="async getHolders(alkane: string, page?: number, limit?: number): Promise<Holder[]>"
          description="Get token holder list for an Alkane."
          params={[
            { name: "alkane", type: "string", desc: "Alkane ID (e.g., '2:0')" },
            { name: "page", type: "number", desc: "Page number (0-indexed)" },
            { name: "limit", type: "number", desc: "Results per page" },
          ]}
          returns="Promise<Holder[]> - Array of holders"
          t={t}
        />
        <MethodDoc
          name="getHoldersCount"
          signature="async getHoldersCount(alkane: string): Promise<number>"
          description="Get total number of holders for an Alkane."
          params={[{ name: "alkane", type: "string", desc: "Alkane ID" }]}
          returns="Promise<number> - Holder count"
          t={t}
        />
        <MethodDoc
          name="getKeys"
          signature="async getKeys(alkane: string, prefix: string, limit?: number): Promise<string[]>"
          description="Get storage keys for an Alkane contract."
          params={[
            { name: "alkane", type: "string", desc: "Alkane ID" },
            { name: "prefix", type: "string", desc: "Key prefix filter" },
            { name: "limit", type: "number", desc: "Max keys to return" },
          ]}
          returns="Promise<string[]> - Array of storage keys"
          t={t}
        />
      </Section>

      {/* BitcoinRpcClient */}
      <Section title={t.bitcoinTitle} id="BitcoinRpcClient">
        <p className="text-[color:var(--sf-muted)] mb-2">{t.bitcoinDesc}</p>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.bitcoinAccess}</p>

        <MethodDoc
          name="getBlockCount"
          signature="async getBlockCount(): Promise<number>"
          description="Get the current block count from Bitcoin Core."
          returns="Promise<number> - Block count"
          t={t}
        />
        <MethodDoc
          name="getBlockHash"
          signature="async getBlockHash(height: number): Promise<string>"
          description="Get block hash at a specific height."
          params={[{ name: "height", type: "number", desc: "Block height" }]}
          returns="Promise<string> - Block hash"
          t={t}
        />
        <MethodDoc
          name="getBlock"
          signature="async getBlock(hash: string, raw?: boolean): Promise<Block>"
          description="Get block data by hash."
          params={[
            { name: "hash", type: "string", desc: "Block hash" },
            { name: "raw", type: "boolean", desc: "Return raw hex instead of parsed" },
          ]}
          returns="Promise<Block> - Block data"
          t={t}
        />
        <MethodDoc
          name="sendRawTransaction"
          signature="async sendRawTransaction(hex: string): Promise<string>"
          description="Broadcast a raw transaction."
          params={[{ name: "hex", type: "string", desc: "Signed transaction hex" }]}
          returns="Promise<string> - Transaction ID"
          t={t}
        />
        <MethodDoc
          name="getTransaction"
          signature="async getTransaction(txid: string, blockHash?: string): Promise<Transaction>"
          description="Get transaction details."
          params={[
            { name: "txid", type: "string", desc: "Transaction ID" },
            { name: "blockHash", type: "string", desc: "Block hash hint (optional)" },
          ]}
          returns="Promise<Transaction> - Transaction data"
          t={t}
        />
        <MethodDoc
          name="getBlockchainInfo"
          signature="async getBlockchainInfo(): Promise<BlockchainInfo>"
          description="Get blockchain state information."
          returns="Promise<BlockchainInfo> - Chain info including sync status"
          t={t}
        />
        <MethodDoc
          name="getNetworkInfo"
          signature="async getNetworkInfo(): Promise<NetworkInfo>"
          description="Get network peer information."
          returns="Promise<NetworkInfo> - Network connectivity info"
          t={t}
        />
        <MethodDoc
          name="getMempoolInfo"
          signature="async getMempoolInfo(): Promise<MempoolInfo>"
          description="Get mempool statistics."
          returns="Promise<MempoolInfo> - Mempool size and fee info"
          t={t}
        />
        <MethodDoc
          name="estimateSmartFee"
          signature="async estimateSmartFee(target: number): Promise<FeeEstimate>"
          description="Estimate fee rate for confirmation target."
          params={[{ name: "target", type: "number", desc: "Target blocks for confirmation" }]}
          returns="Promise<FeeEstimate> - Fee rate in sat/vB"
          t={t}
        />
        <MethodDoc
          name="generateToAddress"
          signature="async generateToAddress(nblocks: number, address: string): Promise<string[]>"
          description="Generate blocks (regtest only)."
          params={[
            { name: "nblocks", type: "number", desc: "Number of blocks to generate" },
            { name: "address", type: "string", desc: "Address for block rewards" },
          ]}
          returns="Promise<string[]> - Generated block hashes"
          t={t}
        />
      </Section>

      {/* Types */}
      <Section title={t.typesTitle} id="Types">
        <p className="text-[color:var(--sf-muted)] mb-4">{t.typesDesc}</p>
        <CodeBlock>{`// Alkane identifier
interface AlkaneId {
  block: number;  // Block number where the alkane was created
  tx: number;     // Transaction index within the block
}

// Token balance
interface AlkaneBalance {
  alkane_id: AlkaneId;  // Or 'id' in some responses
  balance: string;       // Or 'amount' - raw balance (divide by 10^decimals)
  symbol?: string;
  name?: string;
}

// UTXO
interface UTXO {
  txid: string;
  vout: number;
  value: number;  // Satoshis
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

// Outpoint reference
interface Outpoint {
  txid: string;
  vout: number;
}

// Lua execution result
interface LuaResult {
  calls: number;    // Number of RPC calls made
  returns: any;     // Script return value
  runtime: number;  // Execution time in ms
}

// Provider configuration
interface ProviderConfig {
  network: 'mainnet' | 'testnet' | 'signet' | 'regtest' | 'local';
  rpcUrl?: string;
  dataApiUrl?: string;
  bitcoinNetwork?: Network;  // bitcoinjs-lib network
}

// Network presets
const NETWORK_PRESETS = {
  mainnet: {
    networkType: 'mainnet',
    rpcUrl: 'https://mainnet.subfrost.io/v4/jsonrpc',
    dataApiUrl: 'https://mainnet.subfrost.io/v4/jsonrpc',
  },
  testnet: { ... },
  signet: { ... },
  regtest: { ... },
  local: { ... },
};`}</CodeBlock>
      </Section>

      {/* Back to Guide Link */}
      <div className="mt-12 p-4 rounded-lg border border-[color:var(--sf-outline)] bg-[color:var(--sf-surface)]">
        <p className="text-[color:var(--sf-muted)]">
          For usage examples and patterns, see the{" "}
          <Link href="/docs/guides/ts-sdk" className="text-[color:var(--sf-primary)] hover:underline">
            TS SDK Guide
          </Link>.
        </p>
      </div>
    </div>
  );
}
