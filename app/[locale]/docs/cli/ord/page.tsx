"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Ord Commands",
    intro: "The ord namespace provides queries for the Ordinals protocol including inscriptions, runes, satoshis, and related data.",
    overviewTitle: "Commands Overview",
    commands: [
      { cmd: "inscription", desc: "Get inscription details by ID" },
      { cmd: "inscriptions-in-block", desc: "Get all inscriptions in a block" },
      { cmd: "address-info", desc: "Get address information" },
      { cmd: "block-info", desc: "Get block information" },
      { cmd: "block-count", desc: "Get the latest block count" },
      { cmd: "blocks", desc: "Get latest blocks" },
      { cmd: "children", desc: "Get children of an inscription" },
      { cmd: "content", desc: "Get inscription content" },
      { cmd: "output", desc: "Get output information" },
      { cmd: "parents", desc: "Get parents of an inscription" },
      { cmd: "rune", desc: "Get rune information" },
      { cmd: "sat", desc: "Get sat information" },
      { cmd: "tx-info", desc: "Get transaction information" }
    ],
    inscriptionTitle: "ord inscription",
    inscriptionDesc: "Get details about an Ordinal inscription by ID.",
    inscriptionsBlockTitle: "ord inscriptions-in-block",
    inscriptionsBlockDesc: "Get all inscriptions created in a specific block.",
    addressInfoTitle: "ord address-info",
    addressInfoDesc: "Get Ordinals-related information for an address.",
    blockInfoTitle: "ord block-info",
    blockInfoDesc: "Get detailed block information from the Ord indexer.",
    blockCountTitle: "ord block-count",
    blockCountDesc: "Get the current block count from the Ord indexer.",
    childrenTitle: "ord children",
    childrenDesc: "Get child inscriptions of a parent inscription.",
    contentTitle: "ord content",
    contentDesc: "Get the content of an inscription.",
    outputTitle: "ord output",
    outputDesc: "Get information about a specific transaction output.",
    parentsTitle: "ord parents",
    parentsDesc: "Get parent inscriptions of a child inscription.",
    runeTitle: "ord rune",
    runeDesc: "Get information about a Rune by name.",
    satTitle: "ord sat",
    satDesc: "Get information about a specific satoshi.",
    txInfoTitle: "ord tx-info",
    txInfoDesc: "Get transaction information from the Ord indexer.",
    rpcTitle: "JSON-RPC Equivalent",
    rpcDesc: "These CLI commands correspond to JSON-RPC methods:"
  },
  zh: {
    title: "Ord 命令",
    intro: "ord 命名空间提供 Ordinals 协议的查询功能，包括铭文、符文、聪和相关数据。",
    overviewTitle: "命令概览",
    commands: [
      { cmd: "inscription", desc: "按 ID 获取铭文详情" },
      { cmd: "inscriptions-in-block", desc: "获取区块中的所有铭文" },
      { cmd: "address-info", desc: "获取地址信息" },
      { cmd: "block-info", desc: "获取区块信息" },
      { cmd: "block-count", desc: "获取最新区块高度" },
      { cmd: "blocks", desc: "获取最新区块" },
      { cmd: "children", desc: "获取铭文的子铭文" },
      { cmd: "content", desc: "获取铭文内容" },
      { cmd: "output", desc: "获取输出信息" },
      { cmd: "parents", desc: "获取铭文的父铭文" },
      { cmd: "rune", desc: "获取符文信息" },
      { cmd: "sat", desc: "获取聪信息" },
      { cmd: "tx-info", desc: "获取交易信息" }
    ],
    inscriptionTitle: "ord inscription",
    inscriptionDesc: "按 ID 获取 Ordinal 铭文的详情。",
    inscriptionsBlockTitle: "ord inscriptions-in-block",
    inscriptionsBlockDesc: "获取特定区块中创建的所有铭文。",
    addressInfoTitle: "ord address-info",
    addressInfoDesc: "获取地址的 Ordinals 相关信息。",
    blockInfoTitle: "ord block-info",
    blockInfoDesc: "从 Ord 索引器获取详细的区块信息。",
    blockCountTitle: "ord block-count",
    blockCountDesc: "从 Ord 索引器获取当前区块高度。",
    childrenTitle: "ord children",
    childrenDesc: "获取父铭文的子铭文。",
    contentTitle: "ord content",
    contentDesc: "获取铭文的内容。",
    outputTitle: "ord output",
    outputDesc: "获取特定交易输出的信息。",
    parentsTitle: "ord parents",
    parentsDesc: "获取子铭文的父铭文。",
    runeTitle: "ord rune",
    runeDesc: "按名称获取符文信息。",
    satTitle: "ord sat",
    satDesc: "获取特定聪的信息。",
    txInfoTitle: "ord tx-info",
    txInfoDesc: "从 Ord 索引器获取交易信息。",
    rpcTitle: "JSON-RPC 对应方法",
    rpcDesc: "这些 CLI 命令对应以下 JSON-RPC 方法："
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

export default function OrdCommandsPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.overviewTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Command</th>
                <th className="text-left py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.commands.map((cmd, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono">{cmd.cmd}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{cmd.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.inscriptionTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.inscriptionDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord inscription 6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799i0

# Arguments:
# <INSCRIPTION_ID>  Inscription ID (format: txid + i + index)

# Example Response:
# {
#   "id": "6fb976ab...i0",
#   "number": 12345,
#   "address": "bc1p...",
#   "content_type": "image/png",
#   "content_length": 1234,
#   "sat": 1234567890,
#   "timestamp": "2024-01-15T12:30:00Z"
# }`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.inscriptionsBlockTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.inscriptionsBlockDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord inscriptions-in-block 840000

# Arguments:
# <BLOCK_HEIGHT>  Block height to query`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.addressInfoTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.addressInfoDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord address-info bc1p...

# Arguments:
# <ADDRESS>  Bitcoin address to query`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.blockCountTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.blockCountDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord block-count

# Output:
# 850123`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.runeTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.runeDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord rune "UNCOMMON•GOODS"

# Arguments:
# <RUNE_NAME>  Rune name (with bullet character if applicable)

# Example Response:
# {
#   "id": "840000:1",
#   "name": "UNCOMMON•GOODS",
#   "symbol": "⧉",
#   "divisibility": 0,
#   "supply": "21000000",
#   "burned": "0"
# }`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.satTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.satDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord sat 1234567890

# Arguments:
# <SAT>  Satoshi number

# Example Response:
# {
#   "sat": 1234567890,
#   "rarity": "common",
#   "block": 12345,
#   "cycle": 0,
#   "epoch": 0,
#   "period": 0,
#   "inscription": null
# }`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.childrenTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.childrenDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord children 6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799i0

# Arguments:
# <INSCRIPTION_ID>  Parent inscription ID`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.contentTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.contentDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord content 6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799i0

# Arguments:
# <INSCRIPTION_ID>  Inscription ID

# Returns the raw content bytes of the inscription.`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.outputTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.outputDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord output <TXID>:<VOUT>

# Arguments:
# <OUTPOINT>  Transaction output (format: txid:vout)`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.txInfoTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.txInfoDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  ord tx-info <TXID>

# Arguments:
# <TXID>  Transaction ID`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.rpcTitle}</h2>
        <p className="mb-4">{t.rpcDesc}</p>
        <CodeBlock>{`# CLI → JSON-RPC mapping:
# ord inscription → ord_inscription
# ord rune → ord_rune
# ord sat → ord_sat
# ord block-count → ord_blockcount

# Example JSON-RPC:
{
  "jsonrpc": "2.0",
  "method": "ord_inscription",
  "params": ["6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799i0"],
  "id": 1
}`}</CodeBlock>
      </div>
    </div>
  );
}
