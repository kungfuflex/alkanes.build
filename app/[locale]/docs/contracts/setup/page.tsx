"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Project Setup",
    subtitle: "Set up your development environment for building Alkanes smart contracts",
    intro: "Alkanes smart contracts are written in Rust and compiled to WebAssembly (WASM). This guide walks you through setting up a complete development environment.",

    prerequisitesTitle: "Prerequisites",
    prerequisites: [
      "Rust toolchain (rustup, cargo)",
      "wasm32-unknown-unknown target",
      "Docker (for local regtest environment)",
      "alkanes-cli (for deployment and interaction)"
    ],

    rustSetupTitle: "1. Install Rust & WASM Target",
    rustSetupDesc: "Install Rust using rustup and add the WebAssembly target:",

    projectStructureTitle: "2. Project Structure",
    projectStructureDesc: "A typical Alkanes contract project has this structure:",

    cargoTomlTitle: "3. Cargo.toml Configuration",
    cargoTomlDesc: "Configure your contract's dependencies:",

    libRsTitle: "4. Basic Contract Template",
    libRsDesc: "Create your contract entry point in src/lib.rs:",

    buildTitle: "5. Build Your Contract",
    buildDesc: "Compile to WebAssembly:",

    regtestTitle: "6. Local Development Environment",
    regtestDesc: "Set up a local regtest environment for testing:",

    cliSetupTitle: "7. Install alkanes-cli",
    cliSetupDesc: "Build and install the CLI for deployment:",

    walletSetupTitle: "8. Create a Wallet",
    walletSetupDesc: "Create a wallet for regtest deployment:",

    nextStepsTitle: "Next Steps",
    nextSteps: [
      { text: "Learn about alkanes-std", href: "/docs/contracts/std", desc: "Core library and traits" },
      { text: "Build a Token", href: "/docs/tutorials/token", desc: "Step-by-step token tutorial" },
      { text: "Deployment Guide", href: "/docs/contracts/deployment", desc: "Deploy to regtest/mainnet" }
    ]
  },
  zh: {
    title: "项目设置",
    subtitle: "设置构建 Alkanes 智能合约的开发环境",
    intro: "Alkanes 智能合约使用 Rust 编写并编译为 WebAssembly (WASM)。本指南将引导您设置完整的开发环境。",

    prerequisitesTitle: "前提条件",
    prerequisites: [
      "Rust 工具链 (rustup, cargo)",
      "wasm32-unknown-unknown 目标",
      "Docker（用于本地 regtest 环境）",
      "alkanes-cli（用于部署和交互）"
    ],

    rustSetupTitle: "1. 安装 Rust 和 WASM 目标",
    rustSetupDesc: "使用 rustup 安装 Rust 并添加 WebAssembly 目标：",

    projectStructureTitle: "2. 项目结构",
    projectStructureDesc: "典型的 Alkanes 合约项目结构：",

    cargoTomlTitle: "3. Cargo.toml 配置",
    cargoTomlDesc: "配置合约依赖：",

    libRsTitle: "4. 基础合约模板",
    libRsDesc: "在 src/lib.rs 中创建合约入口点：",

    buildTitle: "5. 构建合约",
    buildDesc: "编译为 WebAssembly：",

    regtestTitle: "6. 本地开发环境",
    regtestDesc: "设置用于测试的本地 regtest 环境：",

    cliSetupTitle: "7. 安装 alkanes-cli",
    cliSetupDesc: "构建并安装用于部署的 CLI：",

    walletSetupTitle: "8. 创建钱包",
    walletSetupDesc: "创建用于 regtest 部署的钱包：",

    nextStepsTitle: "下一步",
    nextSteps: [
      { text: "了解 alkanes-std", href: "/docs/contracts/std", desc: "核心库和 traits" },
      { text: "构建代币", href: "/docs/tutorials/token", desc: "代币教程" },
      { text: "部署指南", href: "/docs/contracts/deployment", desc: "部署到 regtest/主网" }
    ]
  }
};

function CodeBlock({ children, title, language = "rust" }: { children: string; title?: string; language?: string }) {
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

export default function ProjectSetupPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.subtitle}</p>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      {/* Prerequisites */}
      <Section title={t.prerequisitesTitle} id="prerequisites">
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.prerequisites.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Section>

      {/* Rust Setup */}
      <Section title={t.rustSetupTitle} id="rust-setup">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.rustSetupDesc}</p>
        <CodeBlock language="bash">{`# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Verify installation
rustc --version
cargo --version`}</CodeBlock>
      </Section>

      {/* Project Structure */}
      <Section title={t.projectStructureTitle} id="project-structure">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.projectStructureDesc}</p>
        <CodeBlock language="text">{`my-alkane/
├── Cargo.toml          # Dependencies and build config
├── src/
│   └── lib.rs          # Contract entry point
└── target/
    └── wasm32-unknown-unknown/
        └── release/
            └── my_alkane.wasm   # Compiled contract`}</CodeBlock>
      </Section>

      {/* Cargo.toml */}
      <Section title={t.cargoTomlTitle} id="cargo-toml">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.cargoTomlDesc}</p>
        <CodeBlock language="toml" title="Cargo.toml">{`[package]
name = "my-alkane"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
# Core runtime - required for all contracts
alkanes-runtime = { git = "https://github.com/kungfuflex/alkanes-rs" }
alkanes-support = { git = "https://github.com/kungfuflex/alkanes-rs" }

# Procedural macros for message dispatch
alkanes-macros = { git = "https://github.com/kungfuflex/alkanes-rs" }

# Storage utilities
metashrew-support = { git = "https://github.com/kungfuflex/alkanes-rs" }

# Error handling
anyhow = "1.0"

[profile.release]
opt-level = "z"      # Optimize for size
lto = true           # Link-time optimization
codegen-units = 1    # Better optimization
panic = "abort"      # Smaller binary`}</CodeBlock>
      </Section>

      {/* Basic Contract */}
      <Section title={t.libRsTitle} id="lib-rs">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.libRsDesc}</p>
        <CodeBlock title="src/lib.rs">{`use alkanes_runtime::runtime::AlkaneResponder;
use alkanes_support::response::CallResponse;
use alkanes_macros::{declare_alkane, MessageDispatch};
use anyhow::Result;

/// Your contract struct - holds no state (state is in storage)
#[derive(Default)]
pub struct MyAlkane(());

/// Message enum - defines your contract's opcodes
#[derive(MessageDispatch)]
pub enum MyAlkaneMessage {
    /// Opcode 0: Initialize the contract
    #[opcode(0)]
    Initialize,

    /// Opcode 99: Get the contract name
    #[opcode(99)]
    #[returns(String)]
    GetName,
}

impl MyAlkane {
    /// Called when opcode 0 is received
    pub fn initialize(&self) -> Result<CallResponse> {
        // Prevent re-initialization
        self.observe_initialization()?;

        let context = self.context()?;
        let response = CallResponse::forward(&context.incoming_alkanes);
        Ok(response)
    }

    /// Called when opcode 99 is received
    pub fn get_name(&self) -> Result<CallResponse> {
        let context = self.context()?;
        let mut response = CallResponse::forward(&context.incoming_alkanes);
        response.data = b"MyAlkane".to_vec();
        Ok(response)
    }
}

// Implement the responder trait
impl AlkaneResponder for MyAlkane {}

// Register the contract entry point
declare_alkane! {
    impl AlkaneResponder for MyAlkane {
        type Message = MyAlkaneMessage;
    }
}`}</CodeBlock>
      </Section>

      {/* Build */}
      <Section title={t.buildTitle} id="build">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.buildDesc}</p>
        <CodeBlock language="bash">{`# Build for WebAssembly
cargo build --release --target wasm32-unknown-unknown

# Find your compiled contract
ls -la target/wasm32-unknown-unknown/release/*.wasm

# Optional: Optimize with wasm-opt (from binaryen)
wasm-opt -Oz target/wasm32-unknown-unknown/release/my_alkane.wasm \\
  -o my_alkane_optimized.wasm`}</CodeBlock>
      </Section>

      {/* Regtest Environment */}
      <Section title={t.regtestTitle} id="regtest">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.regtestDesc}</p>
        <CodeBlock language="bash">{`# Clone alkanes-rs repository
git clone https://github.com/kungfuflex/alkanes-rs.git
cd alkanes-rs

# Start regtest environment with Docker
docker-compose up -d

# Wait for services to start
sleep 10

# Verify the node is running
curl -s http://127.0.0.1:18888 | head -c 100

# Check metashrew indexer
curl -X POST http://127.0.0.1:18888 \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"metashrew_height","params":[],"id":1}'`}</CodeBlock>
      </Section>

      {/* CLI Setup */}
      <Section title={t.cliSetupTitle} id="cli-setup">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.cliSetupDesc}</p>
        <CodeBlock language="bash">{`# Build alkanes-cli from source
cd alkanes-rs
cargo build --release -p alkanes-cli

# Add to PATH
export PATH="$PATH:$(pwd)/target/release"

# Verify installation
alkanes-cli --help`}</CodeBlock>
      </Section>

      {/* Wallet Setup */}
      <Section title={t.walletSetupTitle} id="wallet-setup">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.walletSetupDesc}</p>
        <CodeBlock language="bash">{`# Create a new wallet
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-secure-passphrase" \\
  wallet create

# Fund the wallet (mine 400 blocks)
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-secure-passphrase" \\
  bitcoind generatetoaddress 400 "p2tr:0"

# Check balance
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-secure-passphrase" \\
  wallet balance`}</CodeBlock>
      </Section>

      {/* Next Steps */}
      <Section title={t.nextStepsTitle} id="next-steps">
        <div className="grid gap-4 md:grid-cols-3">
          {t.nextSteps.map((step, i) => (
            <a
              key={i}
              href={step.href}
              className="p-4 rounded-lg border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)] transition-colors"
            >
              <h4 className="font-semibold text-[color:var(--sf-text)] mb-1">{step.text}</h4>
              <p className="text-sm text-[color:var(--sf-muted)]">{step.desc}</p>
            </a>
          ))}
        </div>
      </Section>
    </div>
  );
}
