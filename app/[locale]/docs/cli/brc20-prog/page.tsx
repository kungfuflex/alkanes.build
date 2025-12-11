"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "BRC20-Prog Commands",
    intro: "The brc20-prog namespace provides operations for BRC20-Prog, the EVM-compatible smart contract layer on Bitcoin. This enables Ethereum-style contract deployment and interaction.",
    endpointTitle: "Endpoint Configuration",
    endpointDesc: "BRC20-Prog uses a separate JSON-RPC endpoint:",
    contractOpsTitle: "Contract Operations",
    contractOps: [
      { cmd: "deploy-contract", desc: "Deploy a contract from Foundry build JSON" },
      { cmd: "transact", desc: "Call a contract function (state-changing)" },
      { cmd: "call", desc: "Call a contract function (read-only, eth_call)" },
      { cmd: "wrap-btc", desc: "Wrap BTC to frBTC and execute in brc20-prog" }
    ],
    contractQueriesTitle: "Contract Queries",
    contractQueries: [
      { cmd: "get-code", desc: "Get contract bytecode (eth_getCode)" },
      { cmd: "get-contract-deploys", desc: "Get contract deployments by address" },
      { cmd: "get-storage-at", desc: "Get storage at location (eth_getStorageAt)" }
    ],
    balanceTitle: "Balance & Account",
    balanceCommands: [
      { cmd: "get-balance", desc: "Get frBTC balance (eth_getBalance)" },
      { cmd: "brc20-balance", desc: "Get BRC20 balance (brc20_balance)" },
      { cmd: "get-transaction-count", desc: "Get nonce (eth_getTransactionCount)" }
    ],
    txQueriesTitle: "Transaction Queries",
    txQueries: [
      { cmd: "get-transaction", desc: "Get transaction by hash" },
      { cmd: "get-transaction-receipt", desc: "Get transaction receipt" },
      { cmd: "get-receipt-by-inscription", desc: "Get receipt by inscription ID" },
      { cmd: "trace-transaction", desc: "Get transaction trace" }
    ],
    blockQueriesTitle: "Block Queries",
    blockQueries: [
      { cmd: "block-number", desc: "Get current block number" },
      { cmd: "get-block-by-number", desc: "Get block by number" },
      { cmd: "get-block-by-hash", desc: "Get block by hash" }
    ],
    otherTitle: "Other Commands",
    otherCommands: [
      { cmd: "estimate-gas", desc: "Estimate gas (eth_estimateGas)" },
      { cmd: "chain-id", desc: "Get chain ID (eth_chainId)" },
      { cmd: "gas-price", desc: "Get gas price (eth_gasPrice)" },
      { cmd: "get-logs", desc: "Get logs (eth_getLogs)" },
      { cmd: "unwrap", desc: "Get pending unwraps from FrBTC contract" }
    ],
    deployTitle: "brc20-prog deploy-contract",
    deployDesc: "Deploy a Solidity contract from Foundry build output.",
    transactTitle: "brc20-prog transact",
    transactDesc: "Call a state-changing function on a BRC20-prog contract.",
    wrapBtcTitle: "brc20-prog wrap-btc",
    wrapBtcDesc: "Wrap BTC to frBTC and execute a function on a target contract.",
    callTitle: "brc20-prog call",
    callDesc: "Make a read-only call to a contract (eth_call equivalent).",
    getBalanceTitle: "brc20-prog get-balance",
    getBalanceDesc: "Get the frBTC balance of an address.",
    blockNumberTitle: "brc20-prog block-number",
    blockNumberDesc: "Get the current block number.",
    getLogsTitle: "brc20-prog get-logs",
    getLogsDesc: "Get event logs matching filter criteria.",
    rpcTitle: "JSON-RPC Methods",
    rpcDesc: "BRC20-Prog supports standard Ethereum JSON-RPC methods:",
    rpcSpecificTitle: "BRC20-Prog Specific Methods"
  },
  zh: {
    title: "BRC20-Prog 命令",
    intro: "brc20-prog 命名空间提供 BRC20-Prog 操作，这是比特币上的 EVM 兼容智能合约层。它支持以太坊风格的合约部署和交互。",
    endpointTitle: "端点配置",
    endpointDesc: "BRC20-Prog 使用独立的 JSON-RPC 端点：",
    contractOpsTitle: "合约操作",
    contractOps: [
      { cmd: "deploy-contract", desc: "从 Foundry 构建 JSON 部署合约" },
      { cmd: "transact", desc: "调用合约函数（状态变更）" },
      { cmd: "call", desc: "调用合约函数（只读，eth_call）" },
      { cmd: "wrap-btc", desc: "封装 BTC 为 frBTC 并在 brc20-prog 中执行" }
    ],
    contractQueriesTitle: "合约查询",
    contractQueries: [
      { cmd: "get-code", desc: "获取合约字节码（eth_getCode）" },
      { cmd: "get-contract-deploys", desc: "按地址获取合约部署" },
      { cmd: "get-storage-at", desc: "获取存储位置的值（eth_getStorageAt）" }
    ],
    balanceTitle: "余额与账户",
    balanceCommands: [
      { cmd: "get-balance", desc: "获取 frBTC 余额（eth_getBalance）" },
      { cmd: "brc20-balance", desc: "获取 BRC20 余额（brc20_balance）" },
      { cmd: "get-transaction-count", desc: "获取 nonce（eth_getTransactionCount）" }
    ],
    txQueriesTitle: "交易查询",
    txQueries: [
      { cmd: "get-transaction", desc: "按哈希获取交易" },
      { cmd: "get-transaction-receipt", desc: "获取交易收据" },
      { cmd: "get-receipt-by-inscription", desc: "按铭文 ID 获取收据" },
      { cmd: "trace-transaction", desc: "获取交易跟踪" }
    ],
    blockQueriesTitle: "区块查询",
    blockQueries: [
      { cmd: "block-number", desc: "获取当前区块号" },
      { cmd: "get-block-by-number", desc: "按编号获取区块" },
      { cmd: "get-block-by-hash", desc: "按哈希获取区块" }
    ],
    otherTitle: "其他命令",
    otherCommands: [
      { cmd: "estimate-gas", desc: "估算 Gas（eth_estimateGas）" },
      { cmd: "chain-id", desc: "获取链 ID（eth_chainId）" },
      { cmd: "gas-price", desc: "获取 Gas 价格（eth_gasPrice）" },
      { cmd: "get-logs", desc: "获取日志（eth_getLogs）" },
      { cmd: "unwrap", desc: "获取 FrBTC 合约的待处理解封" }
    ],
    deployTitle: "brc20-prog deploy-contract",
    deployDesc: "从 Foundry 构建输出部署 Solidity 合约。",
    transactTitle: "brc20-prog transact",
    transactDesc: "在 BRC20-prog 合约上调用状态变更函数。",
    wrapBtcTitle: "brc20-prog wrap-btc",
    wrapBtcDesc: "封装 BTC 为 frBTC 并在目标合约上执行函数。",
    callTitle: "brc20-prog call",
    callDesc: "对合约进行只读调用（eth_call 等效）。",
    getBalanceTitle: "brc20-prog get-balance",
    getBalanceDesc: "获取地址的 frBTC 余额。",
    blockNumberTitle: "brc20-prog block-number",
    blockNumberDesc: "获取当前区块号。",
    getLogsTitle: "brc20-prog get-logs",
    getLogsDesc: "获取匹配过滤条件的事件日志。",
    rpcTitle: "JSON-RPC 方法",
    rpcDesc: "BRC20-Prog 支持标准以太坊 JSON-RPC 方法：",
    rpcSpecificTitle: "BRC20-Prog 特定方法"
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

export default function BRC20ProgCommandsPage() {
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
        <p className="mb-4">{t.endpointDesc}</p>
        <CodeBlock>{`# Using the brc20-prog endpoint
alkanes-cli -p mainnet \\
  --brc20-prog-rpc-url https://mainnet.subfrost.io/v4/jsonrpc/brc20-prog \\
  brc20-prog block-number

# Or with your API key:
--brc20-prog-rpc-url https://mainnet.subfrost.io/v4/YOUR_API_KEY/brc20-prog`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.contractOpsTitle}</h2>
        <CommandTable commands={t.contractOps} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.contractQueriesTitle}</h2>
        <CommandTable commands={t.contractQueries} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.balanceTitle}</h2>
        <CommandTable commands={t.balanceCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.txQueriesTitle}</h2>
        <CommandTable commands={t.txQueries} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.blockQueriesTitle}</h2>
        <CommandTable commands={t.blockQueries} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.otherTitle}</h2>
        <CommandTable commands={t.otherCommands} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.deployTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.deployDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --brc20-prog-rpc-url https://mainnet.subfrost.io/v4/jsonrpc/brc20-prog \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-passphrase" \\
  brc20-prog deploy-contract ./out/MyContract.sol/MyContract.json \\
  --fee-rate 10 \\
  -y

# Arguments:
# <FOUNDRY_JSON_PATH>  Path to Foundry build JSON file

# Options:
# --from <FROM>         Addresses to source UTXOs from
# --change <CHANGE>     Change address
# --fee-rate <RATE>     Fee rate in sat/vB
# --trace               Enable transaction tracing
# -y, --auto-confirm    Auto-confirm the transaction`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.transactTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.transactDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --brc20-prog-rpc-url https://mainnet.subfrost.io/v4/jsonrpc/brc20-prog \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-passphrase" \\
  brc20-prog transact \\
  --address 0x1234...abcd \\
  --signature "transfer(address,uint256)" \\
  --calldata "0xRecipient...,1000" \\
  --fee-rate 10 \\
  -y

# Options:
# --address <ADDRESS>       Contract address (0x prefixed hex)
# --signature <SIGNATURE>   Function signature
# --calldata <CALLDATA>     Arguments as comma-separated values`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.wrapBtcTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.wrapBtcDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --brc20-prog-rpc-url https://mainnet.subfrost.io/v4/jsonrpc/brc20-prog \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-passphrase" \\
  brc20-prog wrap-btc 100000 \\
  --target 0x1234...abcd \\
  --signature "deposit()" \\
  --calldata "" \\
  --fee-rate 10 \\
  -y

# Arguments:
# <AMOUNT>  Amount of BTC to wrap (in satoshis)

# Options:
# --target <TARGET>         Target contract address
# --signature <SIGNATURE>   Function signature to call
# --calldata <CALLDATA>     Calldata arguments`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.callTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.callDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --brc20-prog-rpc-url https://mainnet.subfrost.io/v4/jsonrpc/brc20-prog \\
  brc20-prog call \\
  --to 0x1234...abcd \\
  --data 0x70a08231000000000000000000000000...`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getBalanceTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getBalanceDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --brc20-prog-rpc-url https://mainnet.subfrost.io/v4/jsonrpc/brc20-prog \\
  brc20-prog get-balance 0x1234...abcd`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.blockNumberTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.blockNumberDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --brc20-prog-rpc-url https://mainnet.subfrost.io/v4/jsonrpc/brc20-prog \\
  brc20-prog block-number`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.getLogsTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.getLogsDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --brc20-prog-rpc-url https://mainnet.subfrost.io/v4/jsonrpc/brc20-prog \\
  brc20-prog get-logs \\
  --address 0x1234...abcd \\
  --from-block 840000 \\
  --to-block latest`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.rpcTitle}</h2>
        <p className="mb-4">{t.rpcDesc}</p>
        <CodeBlock>{`# Standard Ethereum JSON-RPC methods:
eth_blockNumber
eth_getBalance
eth_getCode
eth_call
eth_estimateGas
eth_getTransactionByHash
eth_getTransactionReceipt
eth_getBlockByNumber
eth_getBlockByHash
eth_getTransactionCount
eth_getStorageAt
eth_getLogs
eth_chainId
eth_gasPrice`}</CodeBlock>

        <h3 className="text-xl font-medium mt-6 mb-3">{t.rpcSpecificTitle}</h3>
        <CodeBlock>{`# BRC20-Prog specific methods:
brc20_version
brc20_balance
brc20_getTxReceiptByInscriptionId
brc20_getInscriptionIdByTxHash
brc20_getInscriptionIdByContractAddress`}</CodeBlock>
      </div>
    </div>
  );
}
