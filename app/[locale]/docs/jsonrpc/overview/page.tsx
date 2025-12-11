"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "JSON-RPC API Overview",
    intro: "The Subfrost API uses JSON-RPC 2.0 as its primary protocol. All methods are accessible through a unified endpoint with namespace prefixes.",
    endpointTitle: "Endpoint",
    requestTitle: "Request Format",
    requestFields: [
      { field: "jsonrpc", desc: "Must be \"2.0\"" },
      { field: "method", desc: "Method name with namespace prefix" },
      { field: "params", desc: "Method parameters (array)" },
      { field: "id", desc: "Request identifier (number/string)" }
    ],
    responseTitle: "Response Format",
    namespacesTitle: "Namespaces",
    namespaces: [
      { ns: "esplora_*", desc: "Electrs block explorer API (e.g., esplora_address::utxo)" },
      { ns: "ord_*", desc: "Ordinals protocol (e.g., ord_inscription)" },
      { ns: "metashrew_*", desc: "Metashrew indexer (e.g., metashrew_view)" },
      { ns: "alkanes_*", desc: "Alkanes protocol (e.g., alkanes_protorunesbyaddress)" },
      { ns: "btc_*", desc: "Bitcoin Core RPC (e.g., btc_getblockcount)" },
      { ns: "lua_*", desc: "Lua script execution (e.g., lua_evalscript)" }
    ],
    namingTitle: "Method Naming Convention",
    namingDesc: "Methods use underscores and double colons to represent REST paths:",
    namingRules: [
      "_ (underscore) - Namespace separator",
      ":: (double colon) - Path parameter placeholder"
    ],
    batchTitle: "Batch Requests",
    batchDesc: "Send multiple requests in a single HTTP call:",
    errorsTitle: "Error Codes",
    errors: [
      { code: "-32700", desc: "Parse error (invalid JSON)" },
      { code: "-32600", desc: "Invalid Request (invalid JSON-RPC request)" },
      { code: "-32601", desc: "Method not found (unknown method)" },
      { code: "-32602", desc: "Invalid params (invalid method parameters)" },
      { code: "-32603", desc: "Internal error (server error)" },
      { code: "-32000", desc: "Rate limit exceeded" }
    ],
    luaTitle: "Using in Lua Scripts",
    luaDesc: "All RPC methods are available in Lua scripts via the _RPC global table:"
  },
  zh: {
    title: "JSON-RPC API 概览",
    intro: "Subfrost API 使用 JSON-RPC 2.0 作为主要协议。所有方法都可以通过带有命名空间前缀的统一端点访问。",
    endpointTitle: "端点",
    requestTitle: "请求格式",
    requestFields: [
      { field: "jsonrpc", desc: "必须为 \"2.0\"" },
      { field: "method", desc: "带命名空间前缀的方法名" },
      { field: "params", desc: "方法参数（数组）" },
      { field: "id", desc: "请求标识符（数字/字符串）" }
    ],
    responseTitle: "响应格式",
    namespacesTitle: "命名空间",
    namespaces: [
      { ns: "esplora_*", desc: "Electrs 区块浏览器 API（如 esplora_address::utxo）" },
      { ns: "ord_*", desc: "Ordinals 协议（如 ord_inscription）" },
      { ns: "metashrew_*", desc: "Metashrew 索引器（如 metashrew_view）" },
      { ns: "alkanes_*", desc: "Alkanes 协议（如 alkanes_protorunesbyaddress）" },
      { ns: "btc_*", desc: "Bitcoin Core RPC（如 btc_getblockcount）" },
      { ns: "lua_*", desc: "Lua 脚本执行（如 lua_evalscript）" }
    ],
    namingTitle: "方法命名约定",
    namingDesc: "方法使用下划线和双冒号表示 REST 路径：",
    namingRules: [
      "_（下划线）- 命名空间分隔符",
      "::（双冒号）- 路径参数占位符"
    ],
    batchTitle: "批量请求",
    batchDesc: "在单个 HTTP 调用中发送多个请求：",
    errorsTitle: "错误代码",
    errors: [
      { code: "-32700", desc: "解析错误（无效 JSON）" },
      { code: "-32600", desc: "无效请求（无效 JSON-RPC 请求）" },
      { code: "-32601", desc: "方法未找到（未知方法）" },
      { code: "-32602", desc: "参数无效（无效方法参数）" },
      { code: "-32603", desc: "内部错误（服务器错误）" },
      { code: "-32000", desc: "超出速率限制" }
    ],
    luaTitle: "在 Lua 脚本中使用",
    luaDesc: "所有 RPC 方法都可以通过 _RPC 全局表在 Lua 脚本中使用："
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

export default function JSONRPCOverviewPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.endpointTitle}</h2>
        <CodeBlock>{`POST https://mainnet.subfrost.io/v4/jsonrpc

# With API key in path:
POST https://mainnet.subfrost.io/v4/<your-api-key>`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.requestTitle}</h2>
        <CodeBlock>{`{
  "jsonrpc": "2.0",
  "method": "namespace_methodname",
  "params": [...],
  "id": 1
}`}</CodeBlock>
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Field</th>
                <th className="text-left py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.requestFields.map((f, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono">{f.field}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.responseTitle}</h2>
        <CodeBlock>{`// Success
{
  "jsonrpc": "2.0",
  "result": { /* method result */ },
  "id": 1
}

// Error
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found"
  },
  "id": 1
}`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.namespacesTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Namespace</th>
                <th className="text-left py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.namespaces.map((ns, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono">{ns.ns}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{ns.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.namingTitle}</h2>
        <p className="mb-4">{t.namingDesc}</p>
        <ul className="list-disc list-inside space-y-1 text-[color:var(--sf-muted)] mb-4">
          {t.namingRules.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
        <CodeBlock>{`# Examples:
esplora_address::utxo     → GET /address/{address}/utxo
ord_inscription           → GET /inscription/{id}
btc_getblockcount         → bitcoind getblockcount`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.batchTitle}</h2>
        <p className="mb-4">{t.batchDesc}</p>
        <CodeBlock>{`// Request
[
  { "jsonrpc": "2.0", "method": "btc_getblockcount", "params": [], "id": 1 },
  { "jsonrpc": "2.0", "method": "btc_getbestblockhash", "params": [], "id": 2 },
  { "jsonrpc": "2.0", "method": "esplora_fee-estimates", "params": [], "id": 3 }
]

// Response
[
  { "jsonrpc": "2.0", "result": 850000, "id": 1 },
  { "jsonrpc": "2.0", "result": "000000000000000000...", "id": 2 },
  { "jsonrpc": "2.0", "result": { "1": 25.5, "6": 15.2 }, "id": 3 }
]`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.errorsTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Code</th>
                <th className="text-left py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.errors.map((e, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono">{e.code}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.luaTitle}</h2>
        <p className="mb-4">{t.luaDesc}</p>
        <CodeBlock>{`-- From within a lua_evalscript
local height = _RPC.btc_getblockcount()
local utxos = _RPC.esplora_addressutxo("bc1q...")
local inscription = _RPC.ord_inscription("abc123i0")

return { height = height, utxo_count = #utxos }`}</CodeBlock>
      </div>
    </div>
  );
}
