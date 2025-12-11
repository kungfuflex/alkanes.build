"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Esplora Commands",
    intro: "The esplora namespace provides block explorer functionality for querying blocks, transactions, addresses, and fee estimates via the Electrs/Esplora API.",
    blockQueriesTitle: "Block Queries",
    blockCommands: [
      { cmd: "blocks-tip-hash", desc: "Get the hash of the latest block" },
      { cmd: "blocks-tip-height", desc: "Get the height of the latest block" },
      { cmd: "blocks", desc: "Get latest blocks" },
      { cmd: "block-height", desc: "Get block hash at a height" },
      { cmd: "block", desc: "Get block details" },
      { cmd: "block-status", desc: "Get block status" },
      { cmd: "block-txids", desc: "Get transaction IDs in a block" },
      { cmd: "block-header", desc: "Get block header" },
      { cmd: "block-raw", desc: "Get raw block data" },
      { cmd: "block-txs", desc: "Get transactions in a block" }
    ],
    addressQueriesTitle: "Address Queries",
    addressCommands: [
      { cmd: "address", desc: "Get address information" },
      { cmd: "address-txs", desc: "Get address transactions" },
      { cmd: "address-txs-chain", desc: "Get confirmed address transactions" },
      { cmd: "address-txs-mempool", desc: "Get mempool transactions for address" },
      { cmd: "address-utxo", desc: "Get UTXOs for an address" },
      { cmd: "address-prefix", desc: "Search addresses by prefix" }
    ],
    txQueriesTitle: "Transaction Queries",
    txCommands: [
      { cmd: "tx", desc: "Get transaction details" },
      { cmd: "tx-hex", desc: "Get transaction as hex" },
      { cmd: "tx-raw", desc: "Get raw transaction data" },
      { cmd: "tx-status", desc: "Get transaction status" },
      { cmd: "tx-merkle-proof", desc: "Get merkle proof" },
      { cmd: "tx-outspend", desc: "Get outpoint spending info" },
      { cmd: "tx-outspends", desc: "Get all output spending info" }
    ],
    otherTitle: "Other Commands",
    otherCommands: [
      { cmd: "broadcast", desc: "Broadcast a transaction" },
      { cmd: "mempool", desc: "Get mempool info" },
      { cmd: "mempool-txids", desc: "Get mempool transaction IDs" },
      { cmd: "mempool-recent", desc: "Get recent mempool transactions" },
      { cmd: "fee-estimates", desc: "Get fee rate estimates" }
    ],
    tipHeightTitle: "esplora blocks-tip-height",
    tipHeightDesc: "Get the current blockchain tip height.",
    tipHashTitle: "esplora blocks-tip-hash",
    tipHashDesc: "Get the hash of the latest block.",
    blockTitle: "esplora block",
    blockDesc: "Get details for a specific block.",
    addressTitle: "esplora address",
    addressDesc: "Get information about a Bitcoin address.",
    utxoTitle: "esplora address-utxo",
    utxoDesc: "Get unspent transaction outputs (UTXOs) for an address.",
    txTitle: "esplora tx",
    txDesc: "Get transaction details.",
    feeTitle: "esplora fee-estimates",
    feeDesc: "Get current fee rate estimates for different confirmation targets.",
    broadcastTitle: "esplora broadcast",
    broadcastDesc: "Broadcast a signed transaction to the network.",
    mempoolTitle: "esplora mempool",
    mempoolDesc: "Get mempool statistics.",
    rpcTitle: "JSON-RPC Equivalent",
    rpcDesc: "These CLI commands correspond to JSON-RPC methods with the esplora_ prefix:"
  },
  zh: {
    title: "Esplora 命令",
    intro: "esplora 命名空间通过 Electrs/Esplora API 提供区块浏览器功能，用于查询区块、交易、地址和费率估算。",
    blockQueriesTitle: "区块查询",
    blockCommands: [
      { cmd: "blocks-tip-hash", desc: "获取最新区块的哈希" },
      { cmd: "blocks-tip-height", desc: "获取最新区块的高度" },
      { cmd: "blocks", desc: "获取最新区块列表" },
      { cmd: "block-height", desc: "获取指定高度的区块哈希" },
      { cmd: "block", desc: "获取区块详情" },
      { cmd: "block-status", desc: "获取区块状态" },
      { cmd: "block-txids", desc: "获取区块中的交易 ID" },
      { cmd: "block-header", desc: "获取区块头" },
      { cmd: "block-raw", desc: "获取原始区块数据" },
      { cmd: "block-txs", desc: "获取区块中的交易" }
    ],
    addressQueriesTitle: "地址查询",
    addressCommands: [
      { cmd: "address", desc: "获取地址信息" },
      { cmd: "address-txs", desc: "获取地址交易" },
      { cmd: "address-txs-chain", desc: "获取已确认的地址交易" },
      { cmd: "address-txs-mempool", desc: "获取地址的内存池交易" },
      { cmd: "address-utxo", desc: "获取地址的 UTXO" },
      { cmd: "address-prefix", desc: "按前缀搜索地址" }
    ],
    txQueriesTitle: "交易查询",
    txCommands: [
      { cmd: "tx", desc: "获取交易详情" },
      { cmd: "tx-hex", desc: "获取交易十六进制" },
      { cmd: "tx-raw", desc: "获取原始交易数据" },
      { cmd: "tx-status", desc: "获取交易状态" },
      { cmd: "tx-merkle-proof", desc: "获取默克尔证明" },
      { cmd: "tx-outspend", desc: "获取输出花费信息" },
      { cmd: "tx-outspends", desc: "获取所有输出的花费信息" }
    ],
    otherTitle: "其他命令",
    otherCommands: [
      { cmd: "broadcast", desc: "广播交易" },
      { cmd: "mempool", desc: "获取内存池信息" },
      { cmd: "mempool-txids", desc: "获取内存池交易 ID" },
      { cmd: "mempool-recent", desc: "获取最近的内存池交易" },
      { cmd: "fee-estimates", desc: "获取费率估算" }
    ],
    tipHeightTitle: "esplora blocks-tip-height",
    tipHeightDesc: "获取当前区块链最新高度。",
    tipHashTitle: "esplora blocks-tip-hash",
    tipHashDesc: "获取最新区块的哈希。",
    blockTitle: "esplora block",
    blockDesc: "获取特定区块的详情。",
    addressTitle: "esplora address",
    addressDesc: "获取比特币地址的信息。",
    utxoTitle: "esplora address-utxo",
    utxoDesc: "获取地址的未花费交易输出（UTXO）。",
    txTitle: "esplora tx",
    txDesc: "获取交易详情。",
    feeTitle: "esplora fee-estimates",
    feeDesc: "获取不同确认目标的当前费率估算。",
    broadcastTitle: "esplora broadcast",
    broadcastDesc: "向网络广播已签名的交易。",
    mempoolTitle: "esplora mempool",
    mempoolDesc: "获取内存池统计信息。",
    rpcTitle: "JSON-RPC 对应方法",
    rpcDesc: "这些 CLI 命令对应带有 esplora_ 前缀的 JSON-RPC 方法："
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

export default function EsploraCommandsPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.blockQueriesTitle}</h2>
        <CommandTable commands={t.blockCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.addressQueriesTitle}</h2>
        <CommandTable commands={t.addressCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.txQueriesTitle}</h2>
        <CommandTable commands={t.txCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.otherTitle}</h2>
        <CommandTable commands={t.otherCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.tipHeightTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.tipHeightDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  esplora blocks-tip-height

# Output:
# Tip Height: 850123`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.blockTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.blockDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  esplora block 840000

# Arguments:
# <BLOCK_HASH_OR_HEIGHT>  Block hash or height`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.addressTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.addressDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  esplora address bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h

# Arguments:
# <ADDRESS>  Bitcoin address`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.utxoTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.utxoDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  esplora address-utxo bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h

# Arguments:
# <ADDRESS>  Bitcoin address

# Example Response:
# [
#   {
#     "txid": "abc123...",
#     "vout": 0,
#     "value": 10000,
#     "status": {
#       "confirmed": true,
#       "block_height": 840000
#     }
#   }
# ]`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.txTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.txDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  esplora tx <TXID>

# Arguments:
# <TXID>  Transaction ID`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.feeTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.feeDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  esplora fee-estimates

# Example Response:
# {
#   "1": 25.5,    // 1 block target: 25.5 sat/vB
#   "3": 20.0,    // 3 block target: 20.0 sat/vB
#   "6": 15.2,    // 6 block target: 15.2 sat/vB
#   "25": 10.0,   // 25 block target: 10.0 sat/vB
#   "144": 5.0,   // 144 block target: 5.0 sat/vB
#   "504": 3.0    // 504 block target: 3.0 sat/vB
# }`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.broadcastTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.broadcastDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  esplora broadcast <TX_HEX>

# Arguments:
# <TX_HEX>  Signed transaction as hexadecimal`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.mempoolTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.mempoolDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  esplora mempool

# Get mempool transaction IDs
alkanes-cli esplora mempool-txids

# Get recent mempool transactions
alkanes-cli esplora mempool-recent`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.rpcTitle}</h2>
        <p className="mb-4">{t.rpcDesc}</p>
        <CodeBlock>{`# CLI → JSON-RPC mapping:
# esplora address-utxo → esplora_address::utxo
# esplora fee-estimates → esplora_fee-estimates
# esplora blocks-tip-height → esplora_blocks:tip:height

# Example JSON-RPC:
{
  "jsonrpc": "2.0",
  "method": "esplora_address::utxo",
  "params": ["bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h"],
  "id": 1
}`}</CodeBlock>
      </div>
    </div>
  );
}
