"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "CLI Reference",
    intro: "The alkanes-cli tool provides a command-line interface for interacting with the Alkanes protocol on Bitcoin.",
    installTitle: "Installation",
    fromSource: "From Source",
    fromNpm: "From npm",
    globalOptionsTitle: "Global Options",
    globalOptions: [
      { option: "-p, --network", desc: "Network to use: mainnet, testnet, signet, regtest" },
      { option: "--wallet-file", desc: "Path to wallet file" },
      { option: "--rpc-url", desc: "Custom RPC endpoint URL" },
      { option: "-v, --verbose", desc: "Enable verbose output" },
      { option: "-y, --yes", desc: "Skip confirmation prompts" }
    ],
    commandsTitle: "Commands Overview",
    walletTitle: "Wallet Commands",
    alkanesTitle: "Alkanes Commands",
    commonOpsTitle: "Common Operations",
    wrapBtcTitle: "Wrapping BTC to frBTC",
    unwrapTitle: "Unwrapping frBTC to BTC",
    deployTitle: "Deploying a Contract",
    interactTitle: "Interacting with Contracts",
    endpointsTitle: "Network Endpoints",
    endpoints: [
      { network: "mainnet", url: "https://mainnet.sandshrew.io/v4" },
      { network: "testnet", url: "https://testnet.sandshrew.io/v4" },
      { network: "signet", url: "https://signet.sandshrew.io/v4" }
    ],
    exampleTitle: "Complete Deployment Flow",
    errorsTitle: "Error Handling",
    errorsIntro: "Common errors and solutions:",
    errors: [
      { error: "Insufficient funds", solution: "Fund your wallet with more satoshis" },
      { error: "Invalid opcode", solution: "Check the contract's supported opcodes" },
      { error: "Contract not found", solution: "Verify the alkane ID is correct" },
      { error: "Fee rate too low", solution: "Increase the --fee-rate parameter" }
    ]
  },
  zh: {
    title: "CLI 参考",
    intro: "alkanes-cli 工具提供了与比特币上 Alkanes 协议交互的命令行界面。",
    installTitle: "安装",
    fromSource: "从源码安装",
    fromNpm: "通过 npm 安装",
    globalOptionsTitle: "全局选项",
    globalOptions: [
      { option: "-p, --network", desc: "使用的网络：mainnet、testnet、signet、regtest" },
      { option: "--wallet-file", desc: "钱包文件路径" },
      { option: "--rpc-url", desc: "自定义 RPC 端点 URL" },
      { option: "-v, --verbose", desc: "启用详细输出" },
      { option: "-y, --yes", desc: "跳过确认提示" }
    ],
    commandsTitle: "命令概览",
    walletTitle: "钱包命令",
    alkanesTitle: "Alkanes 命令",
    commonOpsTitle: "常用操作",
    wrapBtcTitle: "将 BTC 封装为 frBTC",
    unwrapTitle: "将 frBTC 解封为 BTC",
    deployTitle: "部署合约",
    interactTitle: "与合约交互",
    endpointsTitle: "网络端点",
    endpoints: [
      { network: "主网", url: "https://mainnet.sandshrew.io/v4" },
      { network: "测试网", url: "https://testnet.sandshrew.io/v4" },
      { network: "Signet", url: "https://signet.sandshrew.io/v4" }
    ],
    exampleTitle: "完整部署流程",
    errorsTitle: "错误处理",
    errorsIntro: "常见错误及解决方案：",
    errors: [
      { error: "余额不足", solution: "为钱包充值更多聪" },
      { error: "无效操作码", solution: "检查合约支持的操作码" },
      { error: "找不到合约", solution: "验证 Alkane ID 是否正确" },
      { error: "费率过低", solution: "增加 --fee-rate 参数" }
    ]
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

export default function CLIPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.installTitle}</h2>
        <h3 className="text-xl font-medium mb-2">{t.fromSource}</h3>
        <CodeBlock>{`git clone https://github.com/kungfuflex/alkanes-rs.git
cd alkanes-rs
cargo build --release -p alkanes-cli`}</CodeBlock>
        <h3 className="text-xl font-medium mb-2">{t.fromNpm}</h3>
        <CodeBlock>{`npm install -g @alkanes/cli`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.globalOptionsTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-4">Option</th>
                <th className="text-left py-2 px-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.globalOptions.map((opt, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-4 font-mono text-sm">{opt.option}</td>
                  <td className="py-2 px-4 text-[color:var(--sf-muted)]">{opt.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.commandsTitle}</h2>

        <h3 className="text-xl font-medium mb-2 mt-4">{t.walletTitle}</h3>
        <CodeBlock>{`# Create a new wallet
alkanes-cli wallet create

# Import from mnemonic
alkanes-cli wallet import

# Show wallet info
alkanes-cli wallet info

# Get receiving address
alkanes-cli wallet receive

# Check balance
alkanes-cli wallet balance

# Mine blocks (regtest only)
alkanes-cli -p regtest wallet mine 10`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2 mt-4">{t.alkanesTitle}</h3>
        <CodeBlock>{`# Deploy a contract
alkanes-cli alkanes execute "[3,<tx>,0]" --envelope "contract.wasm"

# Execute a contract method
alkanes-cli alkanes execute "[<block>,<tx>,<opcode>,<args...>]"

# Query contract state
alkanes-cli alkanes view "[<block>,<tx>]" "<opcode>"

# List deployed alkanes
alkanes-cli alkanes list`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.commonOpsTitle}</h2>

        <h3 className="text-xl font-medium mb-2 mt-4">{t.wrapBtcTitle}</h3>
        <CodeBlock>{`# Wrap BTC (opcode 77 on frBTC contract [32,0])
alkanes-cli alkanes execute "[32,0,77]" \\
  --fee-rate 10 \\
  -y`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2 mt-4">{t.unwrapTitle}</h3>
        <CodeBlock>{`# Unwrap frBTC (opcode 78 on frBTC contract)
alkanes-cli alkanes execute "[32,0,78,<amount>]" \\
  --fee-rate 10 \\
  -y`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2 mt-4">{t.deployTitle}</h3>
        <CodeBlock>{`# Deploy to reserved address space [4, tx]
alkanes-cli alkanes execute "[3,7936,0]" \\
  --envelope "./my_contract.wasm" \\
  --fee-rate 10 \\
  -y

# Deploy to DIESEL creates at [2, n]
alkanes-cli alkanes execute "[2,0]" \\
  --envelope "./my_contract.wasm" \\
  --fee-rate 10 \\
  -y`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2 mt-4">{t.interactTitle}</h3>
        <CodeBlock>{`# Call a method with arguments
alkanes-cli alkanes execute "[<alkane_block>,<alkane_tx>,<opcode>,<arg1>,<arg2>]" \\
  --fee-rate 10 \\
  -y

# View state (read-only)
alkanes-cli alkanes view "[<alkane_block>,<alkane_tx>]" "<opcode>"

# Execute with trace for debugging
alkanes-cli alkanes execute "[4,0x1f00,99]" \\
  --trace \\
  -y`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.endpointsTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-4">Network</th>
                <th className="text-left py-2 px-4">Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {t.endpoints.map((ep, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-4">{ep.network}</td>
                  <td className="py-2 px-4 font-mono text-sm">{ep.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.exampleTitle}</h2>
        <CodeBlock>{`# 1. Create wallet
alkanes-cli -p signet wallet create

# 2. Get address and fund it
alkanes-cli -p signet wallet receive

# 3. Check balance
alkanes-cli -p signet wallet balance

# 4. Deploy contract
alkanes-cli -p signet alkanes execute "[3,0,0]" \\
  --envelope "./my_contract.wasm" \\
  --fee-rate 10 \\
  -y

# 5. Verify deployment
alkanes-cli -p signet alkanes list`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.errorsTitle}</h2>
        <p className="mb-4">{t.errorsIntro}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-4">Error</th>
                <th className="text-left py-2 px-4">Solution</th>
              </tr>
            </thead>
            <tbody>
              {t.errors.map((err, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-4 font-mono text-sm">{err.error}</td>
                  <td className="py-2 px-4 text-[color:var(--sf-muted)]">{err.solution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
