"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Installation",
    intro: "This guide covers installing alkanes-cli from source and setting up the @alkanes/ts-sdk TypeScript library.",
    cliTitle: "Installing alkanes-cli",
    prereqTitle: "Prerequisites",
    prereqs: ["Rust (1.70+) - Install via rustup.rs", "Git - For cloning the repository", "Build tools - gcc, make, etc."],
    cloneTitle: "Clone and Build",
    pathTitle: "Add to PATH",
    verifyTitle: "Verify Installation",
    walletTitle: "Creating a Wallet",
    walletIntro: "Before using most commands, you need a wallet:",
    addressTitle: "View Your Addresses",
    addressIntro: "This shows addresses for all supported types:",
    addressTypes: ["P2TR (Taproot) - Recommended for Alkanes", "P2WPKH (Native SegWit)", "P2SH (SegWit-compatible)", "P2PKH (Legacy)"],
    sdkTitle: "Installing @alkanes/ts-sdk",
    npmTitle: "From npm",
    sourceTitle: "From Source",
    linkTitle: "Link for Local Development",
    usageTitle: "TypeScript SDK Usage",
    basicTitle: "Basic Setup",
    providerTitle: "Create a Provider",
    configTitle: "Configuration",
    envTitle: "Environment Variables",
    regtestTitle: "Regtest Configuration",
    mainnetTitle: "Mainnet Configuration",
    wasmTitle: "Building WASM Module",
    troubleTitle: "Troubleshooting",
    buildErrorsTitle: "Build Errors",
    connErrorsTitle: "Connection Errors"
  },
  zh: {
    title: "安装",
    intro: "本指南介绍如何从源码安装 alkanes-cli 并设置 @alkanes/ts-sdk TypeScript 库。",
    cliTitle: "安装 alkanes-cli",
    prereqTitle: "前置要求",
    prereqs: ["Rust (1.70+) - 通过 rustup.rs 安装", "Git - 用于克隆代码库", "构建工具 - gcc、make 等"],
    cloneTitle: "克隆并构建",
    pathTitle: "添加到 PATH",
    verifyTitle: "验证安装",
    walletTitle: "创建钱包",
    walletIntro: "使用大多数命令前，您需要一个钱包：",
    addressTitle: "查看地址",
    addressIntro: "显示所有支持类型的地址：",
    addressTypes: ["P2TR (Taproot) - Alkanes 推荐使用", "P2WPKH (原生隔离见证)", "P2SH (兼容隔离见证)", "P2PKH (传统)"],
    sdkTitle: "安装 @alkanes/ts-sdk",
    npmTitle: "从 npm 安装",
    sourceTitle: "从源码安装",
    linkTitle: "本地开发链接",
    usageTitle: "TypeScript SDK 使用",
    basicTitle: "基本设置",
    providerTitle: "创建 Provider",
    configTitle: "配置",
    envTitle: "环境变量",
    regtestTitle: "Regtest 配置",
    mainnetTitle: "主网配置",
    wasmTitle: "构建 WASM 模块",
    troubleTitle: "故障排除",
    buildErrorsTitle: "构建错误",
    connErrorsTitle: "连接错误"
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

export default function InstallationPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.cliTitle}</h2>

        <h3 className="text-xl font-medium mb-2">{t.prereqTitle}</h3>
        <ul className="list-disc list-inside space-y-1 text-[color:var(--sf-muted)] mb-4">
          {t.prereqs.map((p, i) => <li key={i}>{p}</li>)}
        </ul>

        <h3 className="text-xl font-medium mb-2">{t.cloneTitle}</h3>
        <CodeBlock>{`# Clone the repository (develop branch)
git clone https://github.com/kungfuflex/alkanes-rs.git -b develop
cd alkanes-rs

# Build the CLI in release mode
cargo build --release -p alkanes-cli

# The binary is at target/release/alkanes-cli
./target/release/alkanes-cli --version`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.pathTitle}</h3>
        <CodeBlock>{`# Option 1: Copy to system path
sudo cp target/release/alkanes-cli /usr/local/bin/

# Option 2: Add to your shell profile
echo 'export PATH="$HOME/alkanes-rs/target/release:$PATH"' >> ~/.bashrc
source ~/.bashrc`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.verifyTitle}</h3>
        <CodeBlock>{`alkanes-cli --version
alkanes-cli --help`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.walletTitle}</h2>
        <p className="mb-4">{t.walletIntro}</p>
        <CodeBlock>{`# Create a new wallet with a random mnemonic
alkanes-cli wallet create --passphrase "your-secure-passphrase"

# Or restore from an existing mnemonic
alkanes-cli wallet create "your twelve word mnemonic phrase here" \\
  --passphrase "your-secure-passphrase"

# Specify output file
alkanes-cli wallet create --passphrase "your-passphrase" \\
  --output /path/to/wallet.json`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.addressTitle}</h3>
        <CodeBlock>{`alkanes-cli --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-passphrase" \\
  wallet addresses`}</CodeBlock>
        <p className="mb-2">{t.addressIntro}</p>
        <ul className="list-disc list-inside space-y-1 text-[color:var(--sf-muted)]">
          {t.addressTypes.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.sdkTitle}</h2>

        <h3 className="text-xl font-medium mb-2">{t.npmTitle}</h3>
        <CodeBlock>{`npm install @alkanes/ts-sdk
# or
yarn add @alkanes/ts-sdk
# or
pnpm add @alkanes/ts-sdk`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.sourceTitle}</h3>
        <CodeBlock>{`# Clone the repository
git clone https://github.com/kungfuflex/alkanes-rs.git -b develop
cd alkanes-rs/ts-sdk

# Install dependencies
npm install

# Build the SDK (includes WASM)
npm run build`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.linkTitle}</h3>
        <CodeBlock>{`cd alkanes-rs/ts-sdk
npm link

# In your project
npm link @alkanes/ts-sdk`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.usageTitle}</h2>

        <h3 className="text-xl font-medium mb-2">{t.basicTitle}</h3>
        <CodeBlock>{`import {
  createKeystore,
  unlockKeystore,
  createWallet,
  createProvider
} from '@alkanes/ts-sdk';

// Create a new wallet
const { keystore, mnemonic } = await createKeystore('your-password', {
  network: 'mainnet'
});

console.log('Save this mnemonic:', mnemonic);

// Later, unlock the wallet
const unlockedKeystore = await unlockKeystore(keystore, 'your-password');
const wallet = createWallet(unlockedKeystore);

// Get addresses
const taprootAddress = wallet.getReceivingAddress(0);
console.log('Taproot address:', taprootAddress);`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.providerTitle}</h3>
        <CodeBlock>{`import { createProvider } from '@alkanes/ts-sdk';
import * as bitcoin from 'bitcoinjs-lib';

const provider = createProvider({
  url: 'https://mainnet.subfrost.io/v4/jsonrpc',
  network: bitcoin.networks.bitcoin,
  networkType: 'mainnet',
});

// Get balance
const balance = await provider.getBalance(address);
console.log('Balance:', balance);`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.configTitle}</h2>

        <h3 className="text-xl font-medium mb-2">{t.envTitle}</h3>
        <CodeBlock>{`# SUBFROST API key
export SUBFROST_API_KEY="your-api-key"

# Default network
export ALKANES_NETWORK="mainnet"`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.regtestTitle}</h3>
        <CodeBlock>{`alkanes-cli -p regtest \\
  --jsonrpc-url https://regtest.subfrost.io/v4/jsonrpc \\
  --data-api https://regtest.subfrost.io/v4/api \\
  metashrew height`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.mainnetTitle}</h3>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/YOUR_API_KEY \\
  --data-api https://mainnet.subfrost.io/v4/YOUR_API_KEY \\
  metashrew height`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.wasmTitle}</h2>
        <CodeBlock>{`# Install wasm-pack
cargo install wasm-pack

# Build the WASM module
cd alkanes-rs/ts-sdk
npm run build:wasm`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.troubleTitle}</h2>

        <h3 className="text-xl font-medium mb-2">{t.buildErrorsTitle}</h3>
        <CodeBlock>{`# Missing OpenSSL (Ubuntu/Debian)
sudo apt-get install libssl-dev pkg-config

# Missing OpenSSL (macOS)
brew install openssl

# wasm-pack not found
cargo install wasm-pack`}</CodeBlock>

        <h3 className="text-xl font-medium mb-2">{t.connErrorsTitle}</h3>
        <CodeBlock>{`# Rate limiting - use your API key for higher limits
--jsonrpc-url https://mainnet.subfrost.io/v4/YOUR_API_KEY

# Network mismatch - ensure -p matches your endpoint network`}</CodeBlock>
      </div>
    </div>
  );
}
