"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Quick Start",
    intro: "This guide will help you build and deploy your first Alkane smart contract on Bitcoin.",
    prereqTitle: "Prerequisites",
    prereqIntro: "Before you begin, make sure you have:",
    prereqs: [
      "Rust (1.70 or later) - Install from rustup.rs",
      "wasm-pack - cargo install wasm-pack",
      "Node.js (18 or later) - For the CLI and tooling"
    ],
    step1Title: "Step 1: Install the CLI",
    step1Intro: "Clone and build from source:",
    step1Alt: "Or install via npm:",
    step2Title: "Step 2: Create a Wallet",
    step3Title: "Step 3: Create Your Contract",
    step3Intro: "Create a new Rust project:",
    step3Toml: "Update Cargo.toml:",
    step3Code: "Write your contract in src/lib.rs:",
    step4Title: "Step 4: Build the Contract",
    step5Title: "Step 5: Deploy to Bitcoin",
    step6Title: "Step 6: Interact with Your Contract",
    nextStepsTitle: "Next Steps",
    nextSteps: [
      { text: "Learn about contract storage", href: "/docs/concepts/alkanes" },
      { text: "Explore the alkanes-std library", href: "/docs/concepts/alkanes" },
      { text: "Build more complex contracts", href: "/docs/concepts/alkanes" }
    ],
    examplesTitle: "Example Contracts",
    examplesIntro: "Check out these example contracts in the alkanes-rs repository:",
    examples: [
      "DIESEL token - Fungible token implementation",
      "frBTC - Wrapped BTC with futures support",
      "AMM Pool - Automated market maker"
    ]
  },
  zh: {
    title: "快速入门",
    intro: "本指南将帮助您在比特币上构建和部署第一个 Alkane 智能合约。",
    prereqTitle: "前置要求",
    prereqIntro: "开始之前，请确保您已安装：",
    prereqs: [
      "Rust（1.70 或更高版本）- 从 rustup.rs 安装",
      "wasm-pack - cargo install wasm-pack",
      "Node.js（18 或更高版本）- 用于 CLI 和工具"
    ],
    step1Title: "步骤 1：安装 CLI",
    step1Intro: "从源码克隆并构建：",
    step1Alt: "或通过 npm 安装：",
    step2Title: "步骤 2：创建钱包",
    step3Title: "步骤 3：创建合约",
    step3Intro: "创建新的 Rust 项目：",
    step3Toml: "更新 Cargo.toml：",
    step3Code: "在 src/lib.rs 中编写合约：",
    step4Title: "步骤 4：构建合约",
    step5Title: "步骤 5：部署到比特币",
    step6Title: "步骤 6：与合约交互",
    nextStepsTitle: "后续步骤",
    nextSteps: [
      { text: "了解合约存储", href: "/docs/concepts/alkanes" },
      { text: "探索 alkanes-std 库", href: "/docs/concepts/alkanes" },
      { text: "构建更复杂的合约", href: "/docs/concepts/alkanes" }
    ],
    examplesTitle: "示例合约",
    examplesIntro: "查看 alkanes-rs 代码库中的示例合约：",
    examples: [
      "DIESEL 代币 - 同质化代币实现",
      "frBTC - 支持期货的封装 BTC",
      "AMM 池 - 自动做市商"
    ]
  }
};

function CodeBlock({ children, language = "bash" }: { children: string; language?: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

export default function QuickStartPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.prereqTitle}</h2>
        <p className="mb-4">{t.prereqIntro}</p>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.prereqs.map((prereq, i) => (
            <li key={i}><strong>{prereq.split(" - ")[0]}</strong> - {prereq.split(" - ")[1]}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.step1Title}</h2>
        <p>{t.step1Intro}</p>
        <CodeBlock>{`# Clone alkanes-rs
git clone https://github.com/kungfuflex/alkanes-rs.git
cd alkanes-rs

# Build the CLI
cargo build --release -p alkanes-cli

# Add to PATH (optional)
export PATH="$PWD/target/release:$PATH"`}</CodeBlock>
        <p>{t.step1Alt}</p>
        <CodeBlock>{`npm install -g @alkanes/cli`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.step2Title}</h2>
        <CodeBlock>{`# Create a new wallet
alkanes-cli wallet create

# Or import an existing mnemonic
alkanes-cli wallet import

# Fund your wallet (testnet/signet)
alkanes-cli wallet receive  # Shows your address`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.step3Title}</h2>
        <p>{t.step3Intro}</p>
        <CodeBlock>{`cargo new --lib my-alkane
cd my-alkane`}</CodeBlock>
        <p>{t.step3Toml}</p>
        <CodeBlock language="toml">{`[package]
name = "my-alkane"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
alkanes-std = { git = "https://github.com/kungfuflex/alkanes-rs" }
alkanes-support = { git = "https://github.com/kungfuflex/alkanes-rs" }

[profile.release]
opt-level = "z"
lto = true`}</CodeBlock>
        <p>{t.step3Code}</p>
        <CodeBlock language="rust">{`use alkanes_std::prelude::*;
use alkanes_support::context::Context;

#[derive(Default)]
pub struct MyAlkane {
    counter: u64,
}

impl MyAlkane {
    // Initialize the contract
    pub fn new() -> Self {
        Self { counter: 0 }
    }

    // Increment the counter
    pub fn increment(&mut self) {
        self.counter += 1;
    }

    // Get the current count
    pub fn get_count(&self) -> u64 {
        self.counter
    }
}

// Export the contract
alkane!(MyAlkane);`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.step4Title}</h2>
        <CodeBlock>{`# Build to WASM
wasm-pack build --target web --release

# The output will be in pkg/my_alkane_bg.wasm`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.step5Title}</h2>
        <CodeBlock>{`# Deploy to signet (testnet)
alkanes-cli -p signet alkanes execute "[3,0,0]" \\
  --envelope "./pkg/my_alkane_bg.wasm" \\
  --fee-rate 10 \\
  -y

# The output will show your contract's Alkane ID
# e.g., [2, 1] means block 2, tx index 1`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.step6Title}</h2>
        <CodeBlock>{`# Call the increment function (opcode 1)
alkanes-cli -p signet alkanes execute "[2,1,1]" \\
  --fee-rate 10 \\
  -y

# Query the count (opcode 2)
alkanes-cli -p signet alkanes view "[2,1]" "2"`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.nextStepsTitle}</h2>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.nextSteps.map((step, i) => (
            <li key={i}>
              <a href={step.href} className="text-[color:var(--sf-primary)] hover:underline">
                {step.text}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">{t.examplesTitle}</h2>
        <p className="mb-4">{t.examplesIntro}</p>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.examples.map((example, i) => (
            <li key={i}><strong>{example.split(" - ")[0]}</strong> - {example.split(" - ")[1]}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
