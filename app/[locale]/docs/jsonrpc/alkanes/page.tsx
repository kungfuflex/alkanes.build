"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "alkanes_* Methods",
    intro: "The alkanes_* namespace provides access to the Alkanes protocol, an L1 metaprotocol smart contract system built on Bitcoin. Alkanes is a variant of protorunes, and therefore a subprotocol of the runes protocol on Bitcoin L1.",
    overviewTitle: "Overview",
    overviewDesc: "Alkanes are smart contracts that run on Bitcoin, indexed via Metashrew. The alkanes_* methods are convenience wrappers around metashrew_view calls.",
    methodsTitle: "Methods",
    methods: [
      { name: "alkanes_protorunesbyaddress", desc: "Get all alkane tokens held by an address" },
      { name: "alkanes_getbytecode", desc: "Get the bytecode of an alkane contract" },
      { name: "alkanes_simulate", desc: "Simulate an alkane transaction" },
      { name: "alkanes_meta", desc: "Get metadata about an alkane contract" }
    ],
    protorunesTitle: "alkanes_protorunesbyaddress",
    protorunesDesc: "Get all alkane tokens held by an address.",
    bytecodeTitle: "alkanes_getbytecode",
    bytecodeDesc: "Get the bytecode of an alkane contract.",
    simulateTitle: "alkanes_simulate",
    simulateDesc: "Simulate an alkane transaction.",
    metaTitle: "alkanes_meta",
    metaDesc: "Get metadata about an alkane contract.",
    identifiersTitle: "Alkane Identifiers",
    identifiersDesc: "Alkanes are identified by their etching location:",
    identifiersExplain: "This represents the block height where the alkane was created and the transaction index within that block. String format: 840000:1",
    protocolTagTitle: "Protocol Tag",
    protocolTagDesc: "For Alkanes, the protocol tag is always \"1\":"
  },
  zh: {
    title: "alkanes_* 方法",
    intro: "alkanes_* 命名空间提供对 Alkanes 协议的访问，这是一个构建在比特币上的 L1 元协议智能合约系统。Alkanes 是 protorunes 的变体，因此是比特币 L1 上 runes 协议的子协议。",
    overviewTitle: "概述",
    overviewDesc: "Alkanes 是运行在比特币上的智能合约，通过 Metashrew 进行索引。alkanes_* 方法是对 metashrew_view 调用的便捷封装。",
    methodsTitle: "方法",
    methods: [
      { name: "alkanes_protorunesbyaddress", desc: "获取地址持有的所有 alkane 代币" },
      { name: "alkanes_getbytecode", desc: "获取 alkane 合约的字节码" },
      { name: "alkanes_simulate", desc: "模拟 alkane 交易" },
      { name: "alkanes_meta", desc: "获取 alkane 合约的元数据" }
    ],
    protorunesTitle: "alkanes_protorunesbyaddress",
    protorunesDesc: "获取地址持有的所有 alkane 代币。",
    bytecodeTitle: "alkanes_getbytecode",
    bytecodeDesc: "获取 alkane 合约的字节码。",
    simulateTitle: "alkanes_simulate",
    simulateDesc: "模拟 alkane 交易。",
    metaTitle: "alkanes_meta",
    metaDesc: "获取 alkane 合约的元数据。",
    identifiersTitle: "Alkane 标识符",
    identifiersDesc: "Alkanes 通过其铸造位置进行标识：",
    identifiersExplain: "这表示创建 alkane 的区块高度和该区块内的交易索引。字符串格式：840000:1",
    protocolTagTitle: "协议标签",
    protocolTagDesc: "对于 Alkanes，协议标签始终为 \"1\"："
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

export default function AlkanesRPCPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.overviewTitle}</h2>
        <p className="text-[color:var(--sf-muted)]">{t.overviewDesc}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.methodsTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Method</th>
                <th className="text-left py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.methods.map((m, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono">{m.name}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{m.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.protorunesTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.protorunesDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "alkanes_protorunesbyaddress",
  "params": [
    {
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "protocolTag": "1"
    }
  ],
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "outpoints": [
      {
        "outpoint": {
          "txid": "abc123def456...",
          "vout": 0
        },
        "runes": [
          {
            "id": { "block": 840000, "tx": 1 },
            "amount": "1000000000"
          }
        ]
      }
    ]
  },
  "id": 1
}

// Lua Example
local address = args[1]
local result = _RPC.alkanes_protorunesbyaddress({
  address = address,
  protocolTag = "1"
})
return { result_type = type(result) }`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.bytecodeTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.bytecodeDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "alkanes_getbytecode",
  "params": [
    { "block": 840000, "tx": 1 }
  ],
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "bytecode": "0061736d01000000..."
  },
  "id": 1
}`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.simulateTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.simulateDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "alkanes_simulate",
  "params": [
    {
      "alkaneId": { "block": 840000, "tx": 1 },
      "inputs": ["0x..."],
      "target": { "block": 840000, "tx": 2 },
      "pointer": 0,
      "refundPointer": 0,
      "vout": 0,
      "data": "0x..."
    }
  ],
  "id": 1
}`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.metaTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.metaDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "alkanes_meta",
  "params": [
    { "block": 840000, "tx": 1 }
  ],
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "name": "Example Token",
    "symbol": "EXT",
    "decimals": 8,
    "totalSupply": "21000000000000000"
  },
  "id": 1
}`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.identifiersTitle}</h2>
        <p className="mb-4">{t.identifiersDesc}</p>
        <CodeBlock>{`{ "block": 840000, "tx": 1 }`}</CodeBlock>
        <p className="text-[color:var(--sf-muted)]">{t.identifiersExplain}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.protocolTagTitle}</h2>
        <p className="mb-4">{t.protocolTagDesc}</p>
        <CodeBlock>{`{ "protocolTag": "1" }`}</CodeBlock>
      </div>
    </div>
  );
}
