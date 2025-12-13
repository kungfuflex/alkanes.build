"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "alkanes-std Library Reference",
    subtitle: "Core traits, macros, and utilities for building Alkanes smart contracts",
    intro: "The alkanes-std library provides essential building blocks for Alkanes smart contracts. This reference covers the core traits, storage patterns, and macros you'll use when building contracts.",

    overviewTitle: "Overview",
    overviewDesc: "The Alkanes runtime is split across several crates that work together:",
    overviewItems: [
      { name: "alkanes-runtime", desc: "Core runtime with AlkaneResponder trait, storage, and external calls" },
      { name: "alkanes-support", desc: "Types like Context, CallResponse, AlkaneId, and Cellpack" },
      { name: "alkanes-macros", desc: "Procedural macros including MessageDispatch and declare_alkane!" },
      { name: "alkanes-std-factory-support", desc: "MintableToken trait for token implementations" },
      { name: "metashrew-support", desc: "Low-level storage utilities like KeyValuePointer" },
    ],

    alkaneResponderTitle: "AlkaneResponder Trait",
    alkaneResponderDesc: "Every contract must implement the AlkaneResponder trait. It provides access to context, storage, and external calls.",

    responderMethodsTitle: "Core Methods",
    responderMethods: [
      { name: "context()", returns: "Result<Context>", desc: "Get the current execution context (caller, inputs, incoming alkanes)" },
      { name: "observe_initialization()", returns: "Result<()>", desc: "Mark contract as initialized (fails if already initialized)" },
      { name: "height()", returns: "u64", desc: "Get current blockchain height" },
      { name: "fuel()", returns: "u64", desc: "Get remaining execution fuel/gas" },
      { name: "sequence()", returns: "u128", desc: "Get next sequence number for factory spawns" },
      { name: "balance(who, what)", returns: "u128", desc: "Query balance of an alkane for an address" },
      { name: "transaction()", returns: "Vec<u8>", desc: "Get raw transaction bytes" },
      { name: "transaction_id()", returns: "Result<Txid>", desc: "Get the current transaction ID" },
      { name: "block()", returns: "Vec<u8>", desc: "Get raw block bytes" },
    ],

    extcallMethodsTitle: "External Call Methods",
    extcallMethods: [
      { name: "call(cellpack, alkanes, fuel)", returns: "Result<CallResponse>", desc: "Call another contract (state changes persist)" },
      { name: "staticcall(cellpack, alkanes, fuel)", returns: "Result<CallResponse>", desc: "Call without state changes (read-only)" },
      { name: "delegatecall(cellpack, alkanes, fuel)", returns: "Result<CallResponse>", desc: "Call with caller's context (for proxies)" },
    ],

    storageMethodsTitle: "Storage Methods",
    storageMethods: [
      { name: "load(key)", returns: "Vec<u8>", desc: "Load raw bytes from storage" },
      { name: "store(key, value)", returns: "()", desc: "Store raw bytes to storage" },
    ],

    messageDispatchTitle: "MessageDispatch Macro",
    messageDispatchDesc: "The #[derive(MessageDispatch)] macro generates opcode routing for your contract's messages.",
    messageDispatchAttrs: [
      { attr: "#[opcode(N)]", desc: "Map this variant to opcode N (0-255)" },
      { attr: "#[returns(Type)]", desc: "Mark this opcode as returning Type in the response data" },
      { attr: "Variant { field: Type }", desc: "Opcode parameters are decoded from inputs" },
    ],

    declareAlkaneTitle: "declare_alkane! Macro",
    declareAlkaneDesc: "The declare_alkane! macro generates the WASM entry point that connects your contract to the runtime.",

    contextTitle: "Context Structure",
    contextDesc: "The Context provides information about the current execution:",
    contextFields: [
      { name: "myself", type: "AlkaneId", desc: "This contract's ID (block:tx format)" },
      { name: "caller", type: "AlkaneId", desc: "The calling contract's ID (or 0:0 for EOA)" },
      { name: "inputs", type: "Vec<u128>", desc: "Input parameters after the opcode" },
      { name: "incoming_alkanes", type: "AlkaneTransferParcel", desc: "Tokens sent with this call" },
      { name: "vout", type: "u32", desc: "Output index in the transaction" },
    ],

    callResponseTitle: "CallResponse Structure",
    callResponseDesc: "Every opcode handler returns a CallResponse:",
    callResponseFields: [
      { name: "data", type: "Vec<u8>", desc: "Return data (used for #[returns(Type)] values)" },
      { name: "alkanes", type: "AlkaneTransferParcel", desc: "Tokens to send back to caller" },
    ],

    storagePointerTitle: "StoragePointer",
    storagePointerDesc: "StoragePointer provides a convenient way to manage contract storage:",
    storagePointerMethods: [
      { method: "from_keyword(\"/path\")", desc: "Create pointer from a string path" },
      { method: ".select(&key)", desc: "Create sub-pointer by appending key bytes" },
      { method: ".get()", desc: "Load value as Arc<Vec<u8>>" },
      { method: ".set(Arc::new(value))", desc: "Store value" },
      { method: ".get_value::<T>()", desc: "Load and deserialize as type T" },
      { method: ".set_value::<T>(v)", desc: "Serialize and store type T" },
    ],

    authenticatedTitle: "AuthenticatedResponder Trait",
    authenticatedDesc: "For contracts that need owner-only functions, implement AuthenticatedResponder:",
    authenticatedMethods: [
      { name: "deploy_auth_token(units)", desc: "Deploy an auth token during initialization" },
      { name: "only_owner()", desc: "Require auth token in incoming_alkanes (reverts if not present)" },
      { name: "auth_token()", desc: "Get the auth token AlkaneId" },
      { name: "set_auth_token(id)", desc: "Set the auth token (usually done automatically)" },
    ],

    mintableTokenTitle: "MintableToken Trait",
    mintableTokenDesc: "For token contracts, MintableToken provides standard token functionality:",
    mintableTokenMethods: [
      { name: "name() / symbol()", desc: "Get token name and symbol from storage" },
      { name: "set_name_and_symbol_str(name, symbol)", desc: "Set name and symbol during init" },
      { name: "total_supply()", desc: "Get current total supply" },
      { name: "increase_total_supply(v) / decrease_total_supply(v)", desc: "Modify total supply (for mint/burn)" },
      { name: "mint(context, value)", desc: "Create a mint transfer" },
    ],

    cellpackTitle: "Cellpack Structure",
    cellpackDesc: "A Cellpack represents a call to another contract:",

    alkaneIdTitle: "AlkaneId Structure",
    alkaneIdDesc: "Every contract has a unique AlkaneId with block and tx components:",
    alkaneIdTypes: [
      { range: "[2, N]", desc: "Regular deployed contracts (sequence-based)" },
      { range: "[4, N]", desc: "Factory templates deployed at specific tx" },
      { range: "[6, N]", desc: "Clone operations from template N" },
      { range: "[3, N]", desc: "Deploy new contract from tx N" },
    ],

    standardOpcodesTitle: "Standard Opcodes",
    standardOpcodesDesc: "Common opcode conventions across Alkanes contracts:",
    standardOpcodes: [
      { opcode: "0", name: "Initialize", desc: "Contract initialization (usually called once)" },
      { opcode: "77", name: "Mint", desc: "Mint new tokens (if applicable)" },
      { opcode: "88", name: "Burn", desc: "Burn tokens" },
      { opcode: "99", name: "GetName", desc: "Return token/contract name" },
      { opcode: "100", name: "GetSymbol", desc: "Return token symbol" },
      { opcode: "101", name: "GetTotalSupply", desc: "Return total supply" },
    ],

    exampleContractTitle: "Complete Example",
    exampleContractDesc: "A minimal token contract using all the key patterns:",

    nextStepsTitle: "Next Steps",
    nextSteps: [
      { text: "Storage & State", href: "/docs/contracts/storage", desc: "Deep dive into storage patterns" },
      { text: "Build a Token", href: "/docs/tutorials/token", desc: "Step-by-step token tutorial" },
      { text: "Deployment Guide", href: "/docs/contracts/deployment", desc: "Deploy to regtest/mainnet" },
    ],
  },
  zh: {
    title: "alkanes-std 库参考",
    subtitle: "构建 Alkanes 智能合约的核心 traits、宏和工具",
    intro: "alkanes-std 库为 Alkanes 智能合约提供了基本构建块。本参考涵盖了构建合约时使用的核心 traits、存储模式和宏。",

    overviewTitle: "概述",
    overviewDesc: "Alkanes 运行时分布在多个协同工作的 crates 中：",
    overviewItems: [
      { name: "alkanes-runtime", desc: "包含 AlkaneResponder trait、存储和外部调用的核心运行时" },
      { name: "alkanes-support", desc: "Context、CallResponse、AlkaneId 和 Cellpack 等类型" },
      { name: "alkanes-macros", desc: "过程宏，包括 MessageDispatch 和 declare_alkane!" },
      { name: "alkanes-std-factory-support", desc: "用于代币实现的 MintableToken trait" },
      { name: "metashrew-support", desc: "如 KeyValuePointer 等底层存储工具" },
    ],

    alkaneResponderTitle: "AlkaneResponder Trait",
    alkaneResponderDesc: "每个合约都必须实现 AlkaneResponder trait。它提供对上下文、存储和外部调用的访问。",

    responderMethodsTitle: "核心方法",
    responderMethods: [
      { name: "context()", returns: "Result<Context>", desc: "获取当前执行上下文（调用者、输入、传入的 alkanes）" },
      { name: "observe_initialization()", returns: "Result<()>", desc: "标记合约为已初始化（如果已初始化则失败）" },
      { name: "height()", returns: "u64", desc: "获取当前区块高度" },
      { name: "fuel()", returns: "u64", desc: "获取剩余执行燃料/gas" },
      { name: "sequence()", returns: "u128", desc: "获取工厂生成的下一个序列号" },
      { name: "balance(who, what)", returns: "u128", desc: "查询地址的 alkane 余额" },
      { name: "transaction()", returns: "Vec<u8>", desc: "获取原始交易字节" },
      { name: "transaction_id()", returns: "Result<Txid>", desc: "获取当前交易 ID" },
      { name: "block()", returns: "Vec<u8>", desc: "获取原始区块字节" },
    ],

    extcallMethodsTitle: "外部调用方法",
    extcallMethods: [
      { name: "call(cellpack, alkanes, fuel)", returns: "Result<CallResponse>", desc: "调用另一个合约（状态更改持久化）" },
      { name: "staticcall(cellpack, alkanes, fuel)", returns: "Result<CallResponse>", desc: "无状态更改调用（只读）" },
      { name: "delegatecall(cellpack, alkanes, fuel)", returns: "Result<CallResponse>", desc: "使用调用者上下文调用（用于代理）" },
    ],

    storageMethodsTitle: "存储方法",
    storageMethods: [
      { name: "load(key)", returns: "Vec<u8>", desc: "从存储加载原始字节" },
      { name: "store(key, value)", returns: "()", desc: "将原始字节存储到存储" },
    ],

    messageDispatchTitle: "MessageDispatch 宏",
    messageDispatchDesc: "#[derive(MessageDispatch)] 宏为合约消息生成操作码路由。",
    messageDispatchAttrs: [
      { attr: "#[opcode(N)]", desc: "将此变体映射到操作码 N（0-255）" },
      { attr: "#[returns(Type)]", desc: "标记此操作码在响应数据中返回 Type" },
      { attr: "Variant { field: Type }", desc: "操作码参数从输入中解码" },
    ],

    declareAlkaneTitle: "declare_alkane! 宏",
    declareAlkaneDesc: "declare_alkane! 宏生成将合约连接到运行时的 WASM 入口点。",

    contextTitle: "Context 结构",
    contextDesc: "Context 提供有关当前执行的信息：",
    contextFields: [
      { name: "myself", type: "AlkaneId", desc: "此合约的 ID（block:tx 格式）" },
      { name: "caller", type: "AlkaneId", desc: "调用合约的 ID（EOA 为 0:0）" },
      { name: "inputs", type: "Vec<u128>", desc: "操作码后的输入参数" },
      { name: "incoming_alkanes", type: "AlkaneTransferParcel", desc: "随此调用发送的代币" },
      { name: "vout", type: "u32", desc: "交易中的输出索引" },
    ],

    callResponseTitle: "CallResponse 结构",
    callResponseDesc: "每个操作码处理程序返回一个 CallResponse：",
    callResponseFields: [
      { name: "data", type: "Vec<u8>", desc: "返回数据（用于 #[returns(Type)] 值）" },
      { name: "alkanes", type: "AlkaneTransferParcel", desc: "发送回调用者的代币" },
    ],

    storagePointerTitle: "StoragePointer",
    storagePointerDesc: "StoragePointer 提供了管理合约存储的便捷方式：",
    storagePointerMethods: [
      { method: "from_keyword(\"/path\")", desc: "从字符串路径创建指针" },
      { method: ".select(&key)", desc: "通过追加键字节创建子指针" },
      { method: ".get()", desc: "加载值为 Arc<Vec<u8>>" },
      { method: ".set(Arc::new(value))", desc: "存储值" },
      { method: ".get_value::<T>()", desc: "加载并反序列化为类型 T" },
      { method: ".set_value::<T>(v)", desc: "序列化并存储类型 T" },
    ],

    authenticatedTitle: "AuthenticatedResponder Trait",
    authenticatedDesc: "对于需要仅所有者功能的合约，实现 AuthenticatedResponder：",
    authenticatedMethods: [
      { name: "deploy_auth_token(units)", desc: "在初始化期间部署认证代币" },
      { name: "only_owner()", desc: "要求 incoming_alkanes 中有认证代币（如果没有则回滚）" },
      { name: "auth_token()", desc: "获取认证代币 AlkaneId" },
      { name: "set_auth_token(id)", desc: "设置认证代币（通常自动完成）" },
    ],

    mintableTokenTitle: "MintableToken Trait",
    mintableTokenDesc: "对于代币合约，MintableToken 提供标准代币功能：",
    mintableTokenMethods: [
      { name: "name() / symbol()", desc: "从存储获取代币名称和符号" },
      { name: "set_name_and_symbol_str(name, symbol)", desc: "在初始化期间设置名称和符号" },
      { name: "total_supply()", desc: "获取当前总供应量" },
      { name: "increase_total_supply(v) / decrease_total_supply(v)", desc: "修改总供应量（用于铸造/销毁）" },
      { name: "mint(context, value)", desc: "创建铸造转账" },
    ],

    cellpackTitle: "Cellpack 结构",
    cellpackDesc: "Cellpack 表示对另一个合约的调用：",

    alkaneIdTitle: "AlkaneId 结构",
    alkaneIdDesc: "每个合约都有一个唯一的 AlkaneId，包含 block 和 tx 组件：",
    alkaneIdTypes: [
      { range: "[2, N]", desc: "常规部署的合约（基于序列）" },
      { range: "[4, N]", desc: "在特定 tx 部署的工厂模板" },
      { range: "[6, N]", desc: "从模板 N 克隆操作" },
      { range: "[3, N]", desc: "从 tx N 部署新合约" },
    ],

    standardOpcodesTitle: "标准操作码",
    standardOpcodesDesc: "Alkanes 合约中的常见操作码约定：",
    standardOpcodes: [
      { opcode: "0", name: "Initialize", desc: "合约初始化（通常只调用一次）" },
      { opcode: "77", name: "Mint", desc: "铸造新代币（如适用）" },
      { opcode: "88", name: "Burn", desc: "销毁代币" },
      { opcode: "99", name: "GetName", desc: "返回代币/合约名称" },
      { opcode: "100", name: "GetSymbol", desc: "返回代币符号" },
      { opcode: "101", name: "GetTotalSupply", desc: "返回总供应量" },
    ],

    exampleContractTitle: "完整示例",
    exampleContractDesc: "使用所有关键模式的最小代币合约：",

    nextStepsTitle: "下一步",
    nextSteps: [
      { text: "存储与状态", href: "/docs/contracts/storage", desc: "深入了解存储模式" },
      { text: "构建代币", href: "/docs/tutorials/token", desc: "代币教程" },
      { text: "部署指南", href: "/docs/contracts/deployment", desc: "部署到 regtest/主网" },
    ],
  },
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

function MethodTable({ methods }: { methods: { name: string; returns?: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border border-[color:var(--sf-outline)] rounded-lg">
        <thead className="bg-[color:var(--sf-surface)]">
          <tr>
            <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Method</th>
            <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Returns</th>
            <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Description</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m, i) => (
            <tr key={i} className="border-t border-[color:var(--sf-outline)]">
              <td className="p-3 font-mono text-[color:var(--sf-primary)]">{m.name}</td>
              <td className="p-3 font-mono text-[color:var(--sf-muted)]">{m.returns || "-"}</td>
              <td className="p-3 text-[color:var(--sf-muted)]">{m.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlkanesStdPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.subtitle}</p>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      {/* Overview */}
      <Section title={t.overviewTitle} id="overview">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.overviewDesc}</p>
        <div className="space-y-2">
          {t.overviewItems.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <span className="font-mono text-[color:var(--sf-primary)]">{item.name}</span>
              <span className="text-[color:var(--sf-muted)] ml-2">- {item.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* AlkaneResponder */}
      <Section title={t.alkaneResponderTitle} id="alkane-responder">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.alkaneResponderDesc}</p>

        <CodeBlock>{`use alkanes_runtime::runtime::AlkaneResponder;

#[derive(Default)]
pub struct MyContract(());

impl AlkaneResponder for MyContract {}

// Now MyContract has access to all AlkaneResponder methods:
// - context(), height(), fuel(), sequence()
// - call(), staticcall(), delegatecall()
// - load(), store()
// - observe_initialization()`}</CodeBlock>

        <h3 className="text-xl font-semibold mt-6 mb-3 text-[color:var(--sf-text)]">{t.responderMethodsTitle}</h3>
        <MethodTable methods={t.responderMethods} />

        <h3 className="text-xl font-semibold mt-6 mb-3 text-[color:var(--sf-text)]">{t.extcallMethodsTitle}</h3>
        <MethodTable methods={t.extcallMethods} />

        <h3 className="text-xl font-semibold mt-6 mb-3 text-[color:var(--sf-text)]">{t.storageMethodsTitle}</h3>
        <MethodTable methods={t.storageMethods} />
      </Section>

      {/* MessageDispatch */}
      <Section title={t.messageDispatchTitle} id="message-dispatch">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.messageDispatchDesc}</p>

        <CodeBlock>{`use alkanes_runtime::message::MessageDispatch;

#[derive(MessageDispatch)]
pub enum MyMessage {
    // Simple opcode with no parameters
    #[opcode(0)]
    Initialize,

    // Opcode with parameters (decoded from inputs)
    #[opcode(1)]
    Transfer { to: u128, amount: u128 },

    // Opcode that returns data
    #[opcode(99)]
    #[returns(String)]
    GetName,

    // Opcode returning numeric value
    #[opcode(101)]
    #[returns(u128)]
    GetTotalSupply,
}`}</CodeBlock>

        <div className="mt-4 space-y-2">
          {t.messageDispatchAttrs.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <code className="text-[color:var(--sf-primary)]">{item.attr}</code>
              <span className="text-[color:var(--sf-muted)] ml-2">- {item.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* declare_alkane! */}
      <Section title={t.declareAlkaneTitle} id="declare-alkane">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.declareAlkaneDesc}</p>

        <CodeBlock>{`use alkanes_runtime::declare_alkane;

// This macro generates:
// - __execute() entry point for WASM
// - __meta() for ABI export
// - Opcode routing and error handling

declare_alkane! {
    impl AlkaneResponder for MyContract {
        type Message = MyMessage;
    }
}`}</CodeBlock>
      </Section>

      {/* Context */}
      <Section title={t.contextTitle} id="context">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.contextDesc}</p>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-[color:var(--sf-outline)] rounded-lg">
            <thead className="bg-[color:var(--sf-surface)]">
              <tr>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Field</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Type</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.contextFields.map((f, i) => (
                <tr key={i} className="border-t border-[color:var(--sf-outline)]">
                  <td className="p-3 font-mono text-[color:var(--sf-primary)]">{f.name}</td>
                  <td className="p-3 font-mono text-[color:var(--sf-muted)]">{f.type}</td>
                  <td className="p-3 text-[color:var(--sf-muted)]">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CodeBlock>{`fn my_method(&self) -> Result<CallResponse> {
    let context = self.context()?;

    // Access caller info
    let caller = &context.caller;
    let my_id = &context.myself;

    // Access input parameters
    let first_param = context.inputs.get(0).unwrap_or(&0);

    // Access incoming tokens
    for transfer in &context.incoming_alkanes.0 {
        println!("Received {} of {:?}", transfer.value, transfer.id);
    }

    Ok(CallResponse::forward(&context.incoming_alkanes))
}`}</CodeBlock>
      </Section>

      {/* CallResponse */}
      <Section title={t.callResponseTitle} id="call-response">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.callResponseDesc}</p>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-[color:var(--sf-outline)] rounded-lg">
            <thead className="bg-[color:var(--sf-surface)]">
              <tr>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Field</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Type</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.callResponseFields.map((f, i) => (
                <tr key={i} className="border-t border-[color:var(--sf-outline)]">
                  <td className="p-3 font-mono text-[color:var(--sf-primary)]">{f.name}</td>
                  <td className="p-3 font-mono text-[color:var(--sf-muted)]">{f.type}</td>
                  <td className="p-3 text-[color:var(--sf-muted)]">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CodeBlock>{`fn get_name(&self) -> Result<CallResponse> {
    let context = self.context()?;

    // Forward any incoming alkanes back to caller
    let mut response = CallResponse::forward(&context.incoming_alkanes);

    // Set return data (for #[returns(String)])
    response.data = b"MyToken".to_vec();

    Ok(response)
}

fn mint(&self, amount: u128) -> Result<CallResponse> {
    let context = self.context()?;
    let mut response = CallResponse::forward(&context.incoming_alkanes);

    // Add minted tokens to response
    response.alkanes.0.push(AlkaneTransfer {
        id: context.myself.clone(),
        value: amount,
    });

    Ok(response)
}`}</CodeBlock>
      </Section>

      {/* StoragePointer */}
      <Section title={t.storagePointerTitle} id="storage-pointer">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.storagePointerDesc}</p>

        <div className="space-y-2 mb-4">
          {t.storagePointerMethods.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <code className="text-[color:var(--sf-primary)]">{item.method}</code>
              <span className="text-[color:var(--sf-muted)] ml-2">- {item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock>{`use alkanes_runtime::storage::StoragePointer;
use metashrew_support::index_pointer::KeyValuePointer;
use std::sync::Arc;

// Simple key-value storage
fn total_supply_pointer() -> StoragePointer {
    StoragePointer::from_keyword("/totalsupply")
}

fn get_total_supply(&self) -> u128 {
    total_supply_pointer().get_value::<u128>()
}

fn set_total_supply(&self, value: u128) {
    total_supply_pointer().set_value::<u128>(value);
}

// Hierarchical storage with .select()
fn balance_pointer(&self, user: &[u8]) -> StoragePointer {
    StoragePointer::from_keyword("/balances/").select(user)
}

fn get_balance(&self, user: &[u8]) -> u128 {
    self.balance_pointer(user).get_value::<u128>()
}

// Store complex data
fn set_data(&self, key: &str, data: Vec<u8>) {
    let mut ptr = StoragePointer::from_keyword(key);
    ptr.set(Arc::new(data));
}`}</CodeBlock>
      </Section>

      {/* AuthenticatedResponder */}
      <Section title={t.authenticatedTitle} id="authenticated-responder">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.authenticatedDesc}</p>

        <div className="space-y-2 mb-4">
          {t.authenticatedMethods.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <code className="text-[color:var(--sf-primary)]">{item.name}</code>
              <span className="text-[color:var(--sf-muted)] ml-2">- {item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock>{`use alkanes_runtime::auth::AuthenticatedResponder;

#[derive(Default)]
pub struct OwnedContract(());

impl AlkaneResponder for OwnedContract {}
impl AuthenticatedResponder for OwnedContract {}

impl OwnedContract {
    fn initialize(&self, auth_units: u128) -> Result<CallResponse> {
        self.observe_initialization()?;
        let context = self.context()?;
        let mut response = CallResponse::forward(&context.incoming_alkanes);

        // Deploy auth token and add to response
        response.alkanes.0.push(self.deploy_auth_token(auth_units)?);

        Ok(response)
    }

    fn admin_only_function(&self) -> Result<CallResponse> {
        // This will revert if auth token not in incoming_alkanes
        self.only_owner()?;

        // Only executes if caller has auth token
        let context = self.context()?;
        Ok(CallResponse::forward(&context.incoming_alkanes))
    }
}`}</CodeBlock>
      </Section>

      {/* MintableToken */}
      <Section title={t.mintableTokenTitle} id="mintable-token">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.mintableTokenDesc}</p>

        <div className="space-y-2 mb-4">
          {t.mintableTokenMethods.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <code className="text-[color:var(--sf-primary)]">{item.name}</code>
              <span className="text-[color:var(--sf-muted)] ml-2">- {item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock>{`use alkanes_std_factory_support::MintableToken;

#[derive(Default)]
pub struct MyToken(());

impl MintableToken for MyToken {}
impl AlkaneResponder for MyToken {}

impl MyToken {
    fn initialize(&self, name: String, symbol: String, initial_supply: u128) -> Result<CallResponse> {
        self.observe_initialization()?;
        let context = self.context()?;

        // Set token metadata
        self.set_name_and_symbol_str(name, symbol);

        // Mint initial supply
        let mut response = CallResponse::forward(&context.incoming_alkanes);
        let transfer = <Self as MintableToken>::mint(self, &context, initial_supply)?;
        response.alkanes.0.push(transfer);

        Ok(response)
    }

    fn get_total_supply(&self) -> Result<CallResponse> {
        let context = self.context()?;
        let mut response = CallResponse::forward(&context.incoming_alkanes);
        response.data = self.total_supply().to_le_bytes().to_vec();
        Ok(response)
    }
}`}</CodeBlock>
      </Section>

      {/* Cellpack */}
      <Section title={t.cellpackTitle} id="cellpack">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.cellpackDesc}</p>

        <CodeBlock>{`use alkanes_support::cellpack::Cellpack;
use alkanes_support::id::AlkaneId;

// Call another contract
let cellpack = Cellpack {
    target: AlkaneId { block: 2, tx: 12345 },  // Target contract
    inputs: vec![99],  // Opcode 99 (GetName)
};

let response = self.staticcall(
    &cellpack,
    &AlkaneTransferParcel::default(),  // No tokens sent
    self.fuel(),  // Use remaining fuel
)?;

// Call with parameters
let cellpack = Cellpack {
    target: AlkaneId { block: 2, tx: 12345 },
    inputs: vec![
        1,           // Opcode 1 (Transfer)
        recipient,   // First parameter
        amount,      // Second parameter
    ],
};

// Call with token transfer
let response = self.call(
    &cellpack,
    &AlkaneTransferParcel(vec![
        AlkaneTransfer {
            id: AlkaneId { block: 2, tx: 0 },  // DIESEL
            value: 1000000,
        }
    ]),
    self.fuel(),
)?;`}</CodeBlock>
      </Section>

      {/* AlkaneId */}
      <Section title={t.alkaneIdTitle} id="alkane-id">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.alkaneIdDesc}</p>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-[color:var(--sf-outline)] rounded-lg">
            <thead className="bg-[color:var(--sf-surface)]">
              <tr>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Range</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.alkaneIdTypes.map((item, i) => (
                <tr key={i} className="border-t border-[color:var(--sf-outline)]">
                  <td className="p-3 font-mono text-[color:var(--sf-primary)]">{item.range}</td>
                  <td className="p-3 text-[color:var(--sf-muted)]">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CodeBlock>{`use alkanes_support::id::AlkaneId;

// Reference a deployed contract
let diesel = AlkaneId { block: 2, tx: 0 };

// Reference a factory template
let token_factory = AlkaneId { block: 4, tx: 1 };

// Clone from template (opcode prefix)
let clone_op = AlkaneId { block: 6, tx: 1 };

// Deploy new contract (opcode prefix)
let deploy_op = AlkaneId { block: 3, tx: 12345 };

// Access current contract's ID
let context = self.context()?;
let my_id = context.myself;  // e.g., AlkaneId { block: 2, tx: 77 }`}</CodeBlock>
      </Section>

      {/* Standard Opcodes */}
      <Section title={t.standardOpcodesTitle} id="standard-opcodes">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.standardOpcodesDesc}</p>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-[color:var(--sf-outline)] rounded-lg">
            <thead className="bg-[color:var(--sf-surface)]">
              <tr>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Opcode</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Name</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.standardOpcodes.map((op, i) => (
                <tr key={i} className="border-t border-[color:var(--sf-outline)]">
                  <td className="p-3 font-mono text-[color:var(--sf-primary)]">{op.opcode}</td>
                  <td className="p-3 font-mono text-[color:var(--sf-text)]">{op.name}</td>
                  <td className="p-3 text-[color:var(--sf-muted)]">{op.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Complete Example */}
      <Section title={t.exampleContractTitle} id="example">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.exampleContractDesc}</p>

        <CodeBlock title="src/lib.rs">{`use alkanes_runtime::runtime::AlkaneResponder;
use alkanes_runtime::{auth::AuthenticatedResponder, declare_alkane, message::MessageDispatch};
use alkanes_std_factory_support::MintableToken;
use alkanes_support::{context::Context, parcel::AlkaneTransfer, response::CallResponse};
use anyhow::Result;

#[derive(Default)]
pub struct MyToken(());

// Implement required traits
impl MintableToken for MyToken {}
impl AuthenticatedResponder for MyToken {}
impl AlkaneResponder for MyToken {}

// Define message opcodes
#[derive(MessageDispatch)]
enum MyTokenMessage {
    #[opcode(0)]
    Initialize {
        auth_units: u128,
        initial_supply: u128,
        name: String,
        symbol: String,
    },

    #[opcode(77)]
    Mint { amount: u128 },

    #[opcode(88)]
    Burn,

    #[opcode(99)]
    #[returns(String)]
    GetName,

    #[opcode(100)]
    #[returns(String)]
    GetSymbol,

    #[opcode(101)]
    #[returns(u128)]
    GetTotalSupply,
}

impl MyToken {
    fn initialize(
        &self,
        auth_units: u128,
        initial_supply: u128,
        name: String,
        symbol: String,
    ) -> Result<CallResponse> {
        self.observe_initialization()?;
        let context = self.context()?;

        // Set token metadata
        self.set_name_and_symbol_str(name, symbol);

        // Build response
        let mut response = CallResponse::forward(&context.incoming_alkanes);

        // Deploy auth token for owner
        response.alkanes.0.push(self.deploy_auth_token(auth_units)?);

        // Mint initial supply
        let transfer = <Self as MintableToken>::mint(self, &context, initial_supply)?;
        response.alkanes.0.push(transfer);

        Ok(response)
    }

    fn mint(&self, amount: u128) -> Result<CallResponse> {
        self.only_owner()?;  // Require auth token

        let context = self.context()?;
        let mut response = CallResponse::forward(&context.incoming_alkanes);

        let transfer = <Self as MintableToken>::mint(self, &context, amount)?;
        response.alkanes.0.push(transfer);

        Ok(response)
    }

    fn burn(&self) -> Result<CallResponse> {
        let context = self.context()?;

        // Find our token in incoming alkanes
        let burn_amount: u128 = context.incoming_alkanes.0
            .iter()
            .filter(|t| t.id == context.myself)
            .map(|t| t.value)
            .sum();

        // Decrease total supply
        self.decrease_total_supply(burn_amount)?;

        // Return any other tokens (but not our burned tokens)
        let mut response = CallResponse::default();
        for transfer in &context.incoming_alkanes.0 {
            if transfer.id != context.myself {
                response.alkanes.0.push(transfer.clone());
            }
        }

        Ok(response)
    }

    fn get_name(&self) -> Result<CallResponse> {
        let context = self.context()?;
        let mut response = CallResponse::forward(&context.incoming_alkanes);
        response.data = self.name().into_bytes();
        Ok(response)
    }

    fn get_symbol(&self) -> Result<CallResponse> {
        let context = self.context()?;
        let mut response = CallResponse::forward(&context.incoming_alkanes);
        response.data = self.symbol().into_bytes();
        Ok(response)
    }

    fn get_total_supply(&self) -> Result<CallResponse> {
        let context = self.context()?;
        let mut response = CallResponse::forward(&context.incoming_alkanes);
        response.data = self.total_supply().to_le_bytes().to_vec();
        Ok(response)
    }
}

// Register contract entry point
declare_alkane! {
    impl AlkaneResponder for MyToken {
        type Message = MyTokenMessage;
    }
}`}</CodeBlock>
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
