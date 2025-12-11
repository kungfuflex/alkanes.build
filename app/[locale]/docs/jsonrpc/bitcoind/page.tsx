"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "btc_* Methods (Bitcoin Core)",
    intro: "The btc_* namespace provides passthrough access to Bitcoin Core RPC methods. These are the standard bitcoind JSON-RPC methods with a btc_ prefix.",
    blockMethodsTitle: "Block Methods",
    blockMethods: [
      { name: "btc_getblockcount", desc: "Get the current block height" },
      { name: "btc_getblockhash", desc: "Get the block hash at a specific height" },
      { name: "btc_getbestblockhash", desc: "Get the hash of the current best block" },
      { name: "btc_getblock", desc: "Get block data by hash" },
      { name: "btc_getblockheader", desc: "Get block header data" }
    ],
    chainInfoTitle: "Blockchain Info",
    chainMethods: [
      { name: "btc_getblockchaininfo", desc: "Get blockchain state information" },
      { name: "btc_getdifficulty", desc: "Get the current difficulty" }
    ],
    txMethodsTitle: "Transaction Methods",
    txMethods: [
      { name: "btc_getrawtransaction", desc: "Get raw transaction data" },
      { name: "btc_sendrawtransaction", desc: "Broadcast a signed transaction" }
    ],
    mempoolMethodsTitle: "Mempool Methods",
    mempoolMethods: [
      { name: "btc_getmempoolinfo", desc: "Get mempool statistics" },
      { name: "btc_getrawmempool", desc: "Get all mempool transaction IDs" }
    ],
    feeMethodsTitle: "Fee Estimation",
    feeMethods: [
      { name: "btc_estimatesmartfee", desc: "Estimate fee for confirmation within N blocks" }
    ],
    getblockcountTitle: "btc_getblockcount",
    getblockcountDesc: "Get the current block height.",
    getblockhashTitle: "btc_getblockhash",
    getblockhashDesc: "Get the block hash at a specific height.",
    getbestblockhashTitle: "btc_getbestblockhash",
    getbestblockhashDesc: "Get the hash of the current best block.",
    getblockTitle: "btc_getblock",
    getblockDesc: "Get block data by hash. Verbosity: 0=hex, 1=JSON, 2=JSON with full tx.",
    getblockchaininfoTitle: "btc_getblockchaininfo",
    getblockchaininfoDesc: "Get blockchain state information.",
    getdifficultyTitle: "btc_getdifficulty",
    getdifficultyDesc: "Get the current difficulty.",
    getrawtransactionTitle: "btc_getrawtransaction",
    getrawtransactionDesc: "Get raw transaction data.",
    sendrawtransactionTitle: "btc_sendrawtransaction",
    sendrawtransactionDesc: "Broadcast a signed transaction.",
    getmempoolinfoTitle: "btc_getmempoolinfo",
    getmempoolinfoDesc: "Get mempool statistics.",
    getrawmempoolTitle: "btc_getrawmempool",
    getrawmempoolDesc: "Get all mempool transaction IDs.",
    estimatesmartfeeTitle: "btc_estimatesmartfee",
    estimatesmartfeeDesc: "Estimate fee for confirmation within N blocks."
  },
  zh: {
    title: "btc_* 方法 (Bitcoin Core)",
    intro: "btc_* 命名空间提供对 Bitcoin Core RPC 方法的直通访问。这些是带有 btc_ 前缀的标准 bitcoind JSON-RPC 方法。",
    blockMethodsTitle: "区块方法",
    blockMethods: [
      { name: "btc_getblockcount", desc: "获取当前区块高度" },
      { name: "btc_getblockhash", desc: "获取指定高度的区块哈希" },
      { name: "btc_getbestblockhash", desc: "获取当前最佳区块的哈希" },
      { name: "btc_getblock", desc: "按哈希获取区块数据" },
      { name: "btc_getblockheader", desc: "获取区块头数据" }
    ],
    chainInfoTitle: "区块链信息",
    chainMethods: [
      { name: "btc_getblockchaininfo", desc: "获取区块链状态信息" },
      { name: "btc_getdifficulty", desc: "获取当前难度" }
    ],
    txMethodsTitle: "交易方法",
    txMethods: [
      { name: "btc_getrawtransaction", desc: "获取原始交易数据" },
      { name: "btc_sendrawtransaction", desc: "广播已签名的交易" }
    ],
    mempoolMethodsTitle: "内存池方法",
    mempoolMethods: [
      { name: "btc_getmempoolinfo", desc: "获取内存池统计信息" },
      { name: "btc_getrawmempool", desc: "获取所有内存池交易 ID" }
    ],
    feeMethodsTitle: "费用估算",
    feeMethods: [
      { name: "btc_estimatesmartfee", desc: "估算在 N 个区块内确认所需的费用" }
    ],
    getblockcountTitle: "btc_getblockcount",
    getblockcountDesc: "获取当前区块高度。",
    getblockhashTitle: "btc_getblockhash",
    getblockhashDesc: "获取指定高度的区块哈希。",
    getbestblockhashTitle: "btc_getbestblockhash",
    getbestblockhashDesc: "获取当前最佳区块的哈希。",
    getblockTitle: "btc_getblock",
    getblockDesc: "按哈希获取区块数据。详细程度：0=十六进制，1=JSON，2=包含完整交易的 JSON。",
    getblockchaininfoTitle: "btc_getblockchaininfo",
    getblockchaininfoDesc: "获取区块链状态信息。",
    getdifficultyTitle: "btc_getdifficulty",
    getdifficultyDesc: "获取当前难度。",
    getrawtransactionTitle: "btc_getrawtransaction",
    getrawtransactionDesc: "获取原始交易数据。",
    sendrawtransactionTitle: "btc_sendrawtransaction",
    sendrawtransactionDesc: "广播已签名的交易。",
    getmempoolinfoTitle: "btc_getmempoolinfo",
    getmempoolinfoDesc: "获取内存池统计信息。",
    getrawmempoolTitle: "btc_getrawmempool",
    getrawmempoolDesc: "获取所有内存池交易 ID。",
    estimatesmartfeeTitle: "btc_estimatesmartfee",
    estimatesmartfeeDesc: "估算在 N 个区块内确认所需的费用。"
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

function MethodTable({ methods }: { methods: { name: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[color:var(--sf-outline)]">
            <th className="text-left py-2 px-3">Method</th>
            <th className="text-left py-2 px-3">Description</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m, i) => (
            <tr key={i} className="border-b border-[color:var(--sf-outline)]">
              <td className="py-2 px-3 font-mono">{m.name}</td>
              <td className="py-2 px-3 text-[color:var(--sf-muted)]">{m.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BitcoinRPCPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.blockMethodsTitle}</h2>
        <MethodTable methods={t.blockMethods} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.chainInfoTitle}</h2>
        <MethodTable methods={t.chainMethods} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.txMethodsTitle}</h2>
        <MethodTable methods={t.txMethods} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.mempoolMethodsTitle}</h2>
        <MethodTable methods={t.mempoolMethods} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.feeMethodsTitle}</h2>
        <MethodTable methods={t.feeMethods} />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">{t.getblockcountTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getblockcountDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "btc_getblockcount",
  "params": [],
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": 925736,
  "id": 1
}

// Lua Example
local height = _RPC.btc_getblockcount()
return { current_height = height }`}</CodeBlock>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">{t.getblockhashTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getblockhashDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "btc_getblockhash",
  "params": [840000],
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": "0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5",
  "id": 1
}

// Lua Example
local hash = _RPC.btc_getblockhash(840000)
return { block_hash = hash }`}</CodeBlock>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">{t.getblockTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getblockDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "btc_getblock",
  "params": ["0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5", 1],
  "id": 1
}

// Lua Example
local height = _RPC.btc_getblockcount()
local hash = _RPC.btc_getblockhash(height)
local block = _RPC.btc_getblock(hash, 1)
return {
  height = block.height,
  time = block.time,
  tx_count = #block.tx
}`}</CodeBlock>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">{t.getblockchaininfoTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getblockchaininfoDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "btc_getblockchaininfo",
  "params": [],
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "chain": "main",
    "blocks": 925737,
    "headers": 925737,
    "bestblockhash": "000000000000000000001d43...",
    "difficulty": 149301205959699.9,
    "verificationprogress": 1,
    "pruned": false
  },
  "id": 1
}

// Lua Example
local info = _RPC.btc_getblockchaininfo()
return {
  chain = info.chain,
  height = info.blocks,
  difficulty = info.difficulty
}`}</CodeBlock>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">{t.getmempoolinfoTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getmempoolinfoDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "btc_getmempoolinfo",
  "params": [],
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "loaded": true,
    "size": 15381,
    "bytes": 14475763,
    "usage": 76718160,
    "total_fee": 0.02045846
  },
  "id": 1
}

// Lua Example
local mempool = _RPC.btc_getmempoolinfo()
return {
  tx_count = mempool.size,
  size_mb = mempool.bytes / 1000000
}`}</CodeBlock>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">{t.estimatesmartfeeTitle}</h3>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.estimatesmartfeeDesc}</p>
        <CodeBlock>{`// Request
{
  "jsonrpc": "2.0",
  "method": "btc_estimatesmartfee",
  "params": [6],
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "feerate": 0.00001013,
    "blocks": 6
  },
  "id": 1
}

// Note: Use esplora_feeestimates in Lua scripts instead`}</CodeBlock>
      </div>
    </div>
  );
}
