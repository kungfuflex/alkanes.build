"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Storage & State Management",
    subtitle: "Patterns for persisting data in Alkanes smart contracts",
    intro: "Alkanes contracts store state using key-value storage accessed through StoragePointer. This guide covers storage patterns from simple values to complex data structures.",

    basicsTitle: "Storage Basics",
    basicsDesc: "All contract state is stored in a key-value store. The StoragePointer type provides a convenient API for reading and writing values.",

    storagePointerTitle: "StoragePointer API",
    storagePointerDesc: "StoragePointer wraps a key path and provides methods for reading/writing values:",

    primitiveTypesTitle: "Storing Primitive Types",
    primitiveTypesDesc: "Use get_value/set_value for types that implement byte serialization:",
    primitiveTypes: [
      { type: "u128", note: "Most common - token amounts, counts, etc." },
      { type: "u64", note: "Timestamps, heights" },
      { type: "u32", note: "Smaller counters, block timestamps" },
      { type: "u8", note: "Flags, small enums" },
      { type: "bool", note: "Via u8 (0 = false, 1 = true)" },
    ],

    stringsTitle: "Storing Strings",
    stringsDesc: "Store strings as raw bytes using Arc<Vec<u8>>:",

    alkaneIdTitle: "Storing AlkaneId",
    alkaneIdDesc: "AlkaneId can be converted to/from Vec<u8>:",

    hierarchicalTitle: "Hierarchical Storage",
    hierarchicalDesc: "Use .select() to create nested storage namespaces:",

    mappingTitle: "Mapping Pattern",
    mappingDesc: "Create key-value mappings by combining base paths with keys:",

    initializationTitle: "Initialization Pattern",
    initializationDesc: "Use observe_initialization() to ensure a contract is only initialized once:",

    poolStorageTitle: "Real-World Example: AMM Pool",
    poolStorageDesc: "Here's how an AMM pool manages multiple storage values:",

    customTypesTitle: "Custom Storable Types",
    customTypesDesc: "For complex types, implement byte serialization manually:",

    storagePathsTitle: "Storage Path Conventions",
    storagePathsDesc: "Follow these conventions for consistent storage layout:",
    storagePaths: [
      { path: "/initialized", desc: "Contract initialization flag" },
      { path: "/name", desc: "Token/contract name" },
      { path: "/symbol", desc: "Token symbol" },
      { path: "/totalsupply", desc: "Total supply for tokens" },
      { path: "/auth", desc: "Auth token AlkaneId for authenticated contracts" },
      { path: "/owner", desc: "Owner address or AlkaneId" },
      { path: "/balances/{addr}", desc: "User balances (mapping pattern)" },
      { path: "/allowances/{owner}/{spender}", desc: "Token allowances" },
      { path: "/seen/{hash}", desc: "Prevent replay attacks" },
    ],

    bestPracticesTitle: "Best Practices",
    bestPractices: [
      { title: "Use descriptive paths", desc: "Path names should be self-documenting: /reserves/token0 not /r/0" },
      { title: "Prefix with slash", desc: "Always start paths with / for consistency" },
      { title: "Group related data", desc: "Use hierarchical paths: /pool/reserves, /pool/fees" },
      { title: "Consider key size", desc: "Short paths save storage but be descriptive enough" },
      { title: "Handle missing values", desc: "get() returns empty Vec for missing keys - check length" },
      { title: "Use checked arithmetic", desc: "Always use checked_add/checked_sub for amounts" },
    ],

    readBeforeWriteTitle: "Read-Modify-Write Pattern",
    readBeforeWriteDesc: "When modifying values, always read first then write the new value:",

    nextStepsTitle: "Next Steps",
    nextSteps: [
      { text: "Build a Token", href: "/docs/tutorials/token", desc: "Apply storage patterns" },
      { text: "Testing Guide", href: "/docs/contracts/testing", desc: "Test your storage logic" },
      { text: "Deployment", href: "/docs/contracts/deployment", desc: "Deploy your contract" },
    ],
  },
  zh: {
    title: "存储与状态管理",
    subtitle: "在 Alkanes 智能合约中持久化数据的模式",
    intro: "Alkanes 合约通过 StoragePointer 访问键值存储来保存状态。本指南涵盖从简单值到复杂数据结构的存储模式。",

    basicsTitle: "存储基础",
    basicsDesc: "所有合约状态都存储在键值存储中。StoragePointer 类型提供了便捷的读写 API。",

    storagePointerTitle: "StoragePointer API",
    storagePointerDesc: "StoragePointer 包装一个键路径并提供读写方法：",

    primitiveTypesTitle: "存储原始类型",
    primitiveTypesDesc: "对于实现字节序列化的类型使用 get_value/set_value：",
    primitiveTypes: [
      { type: "u128", note: "最常用 - 代币数量、计数等" },
      { type: "u64", note: "时间戳、高度" },
      { type: "u32", note: "较小的计数器、区块时间戳" },
      { type: "u8", note: "标志、小型枚举" },
      { type: "bool", note: "通过 u8（0 = false, 1 = true）" },
    ],

    stringsTitle: "存储字符串",
    stringsDesc: "使用 Arc<Vec<u8>> 将字符串存储为原始字节：",

    alkaneIdTitle: "存储 AlkaneId",
    alkaneIdDesc: "AlkaneId 可以与 Vec<u8> 相互转换：",

    hierarchicalTitle: "层级存储",
    hierarchicalDesc: "使用 .select() 创建嵌套存储命名空间：",

    mappingTitle: "映射模式",
    mappingDesc: "通过组合基本路径和键来创建键值映射：",

    initializationTitle: "初始化模式",
    initializationDesc: "使用 observe_initialization() 确保合约只初始化一次：",

    poolStorageTitle: "实际示例：AMM 池",
    poolStorageDesc: "AMM 池如何管理多个存储值：",

    customTypesTitle: "自定义可存储类型",
    customTypesDesc: "对于复杂类型，手动实现字节序列化：",

    storagePathsTitle: "存储路径约定",
    storagePathsDesc: "遵循这些约定以保持一致的存储布局：",
    storagePaths: [
      { path: "/initialized", desc: "合约初始化标志" },
      { path: "/name", desc: "代币/合约名称" },
      { path: "/symbol", desc: "代币符号" },
      { path: "/totalsupply", desc: "代币总供应量" },
      { path: "/auth", desc: "认证合约的认证代币 AlkaneId" },
      { path: "/owner", desc: "所有者地址或 AlkaneId" },
      { path: "/balances/{addr}", desc: "用户余额（映射模式）" },
      { path: "/allowances/{owner}/{spender}", desc: "代币授权额度" },
      { path: "/seen/{hash}", desc: "防止重放攻击" },
    ],

    bestPracticesTitle: "最佳实践",
    bestPractices: [
      { title: "使用描述性路径", desc: "路径名应自文档化：使用 /reserves/token0 而非 /r/0" },
      { title: "以斜杠开头", desc: "为保持一致性，路径始终以 / 开头" },
      { title: "分组相关数据", desc: "使用层级路径：/pool/reserves, /pool/fees" },
      { title: "考虑键大小", desc: "短路径节省存储，但要足够描述性" },
      { title: "处理缺失值", desc: "get() 对缺失键返回空 Vec - 检查长度" },
      { title: "使用安全算术", desc: "金额计算始终使用 checked_add/checked_sub" },
    ],

    readBeforeWriteTitle: "读取-修改-写入模式",
    readBeforeWriteDesc: "修改值时，始终先读取然后写入新值：",

    nextStepsTitle: "下一步",
    nextSteps: [
      { text: "构建代币", href: "/docs/tutorials/token", desc: "应用存储模式" },
      { text: "测试指南", href: "/docs/contracts/testing", desc: "测试存储逻辑" },
      { text: "部署", href: "/docs/contracts/deployment", desc: "部署合约" },
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

export default function StoragePage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.subtitle}</p>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      {/* Storage Basics */}
      <Section title={t.basicsTitle} id="basics">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.basicsDesc}</p>

        <CodeBlock>{`use alkanes_runtime::storage::StoragePointer;
use metashrew_support::index_pointer::KeyValuePointer;
use std::sync::Arc;

// Create a storage pointer from a path
let pointer = StoragePointer::from_keyword("/my-value");

// Read raw bytes
let data: Arc<Vec<u8>> = pointer.get();

// Write raw bytes
pointer.set(Arc::new(vec![1, 2, 3, 4]));

// Check if value exists
if pointer.get().len() == 0 {
    println!("Value not set");
}`}</CodeBlock>
      </Section>

      {/* StoragePointer API */}
      <Section title={t.storagePointerTitle} id="storage-pointer">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.storagePointerDesc}</p>

        <CodeBlock>{`use alkanes_runtime::storage::StoragePointer;
use metashrew_support::index_pointer::KeyValuePointer;
use std::sync::Arc;

// ===== Creating Pointers =====

// From a keyword/path
let ptr = StoragePointer::from_keyword("/totalsupply");

// Hierarchical selection (creates: /balances/{user_bytes})
let balance_ptr = StoragePointer::from_keyword("/balances/")
    .select(&user_address_bytes);

// ===== Reading Values =====

// Raw bytes
let raw: Arc<Vec<u8>> = ptr.get();

// Typed value (for types implementing byte conversion)
let supply: u128 = ptr.get_value::<u128>();

// ===== Writing Values =====

// Raw bytes (requires Arc)
ptr.set(Arc::new(b"hello".to_vec()));

// Typed value
ptr.set_value::<u128>(1000000);

// ===== Existence Check =====
if ptr.get().len() == 0 {
    // Value doesn't exist or is empty
}`}</CodeBlock>
      </Section>

      {/* Primitive Types */}
      <Section title={t.primitiveTypesTitle} id="primitive-types">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.primitiveTypesDesc}</p>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-[color:var(--sf-outline)] rounded-lg">
            <thead className="bg-[color:var(--sf-surface)]">
              <tr>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Type</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Usage</th>
              </tr>
            </thead>
            <tbody>
              {t.primitiveTypes.map((item, i) => (
                <tr key={i} className="border-t border-[color:var(--sf-outline)]">
                  <td className="p-3 font-mono text-[color:var(--sf-primary)]">{item.type}</td>
                  <td className="p-3 text-[color:var(--sf-muted)]">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CodeBlock>{`// u128 - Most common for token amounts
fn total_supply_pointer(&self) -> StoragePointer {
    StoragePointer::from_keyword("/totalsupply")
}

fn total_supply(&self) -> u128 {
    self.total_supply_pointer().get_value::<u128>()
}

fn set_total_supply(&self, v: u128) {
    self.total_supply_pointer().set_value::<u128>(v);
}

// u64 - Timestamps, heights
fn last_update_pointer(&self) -> StoragePointer {
    StoragePointer::from_keyword("/lastupdated")
}

fn last_update(&self) -> u64 {
    self.last_update_pointer().get_value::<u64>()
}

// u32 - Smaller values
fn block_timestamp_last(&self) -> u32 {
    StoragePointer::from_keyword("/blockTimestampLast").get_value::<u32>()
}

// u8 - Flags
fn is_paused(&self) -> bool {
    StoragePointer::from_keyword("/paused").get_value::<u8>() == 1
}

fn set_paused(&self, paused: bool) {
    StoragePointer::from_keyword("/paused")
        .set_value::<u8>(if paused { 1 } else { 0 });
}`}</CodeBlock>
      </Section>

      {/* Strings */}
      <Section title={t.stringsTitle} id="strings">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.stringsDesc}</p>

        <CodeBlock>{`use std::sync::Arc;

fn name_pointer(&self) -> StoragePointer {
    StoragePointer::from_keyword("/name")
}

fn name(&self) -> String {
    let bytes = self.name_pointer().get();
    String::from_utf8(bytes.as_ref().clone())
        .expect("name not valid utf-8")
}

fn set_name(&self, name: String) {
    self.name_pointer().set(Arc::new(name.into_bytes()));
}

// More robust version with fallback
fn name_or_default(&self) -> String {
    let bytes = self.name_pointer().get();
    if bytes.len() == 0 {
        String::from("Unknown")
    } else {
        String::from_utf8(bytes.as_ref().clone())
            .unwrap_or_else(|_| String::from("Invalid"))
    }
}`}</CodeBlock>
      </Section>

      {/* AlkaneId */}
      <Section title={t.alkaneIdTitle} id="alkane-id">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.alkaneIdDesc}</p>

        <CodeBlock>{`use alkanes_support::id::AlkaneId;
use std::sync::Arc;

fn factory_pointer(&self) -> StoragePointer {
    StoragePointer::from_keyword("/factory_id")
}

fn factory(&self) -> Result<AlkaneId> {
    let bytes = self.factory_pointer().get();
    if bytes.len() == 0 {
        return Err(anyhow!("factory not set"));
    }
    // Convert bytes to AlkaneId
    bytes.as_ref().clone().try_into()
        .map_err(|_| anyhow!("invalid factory id"))
}

fn set_factory(&self, factory_id: AlkaneId) {
    let bytes: Vec<u8> = factory_id.into();
    self.factory_pointer().set(Arc::new(bytes));
}

// Store two AlkaneIds (e.g., token pair)
fn alkane_pair_pointer(&self) -> StoragePointer {
    StoragePointer::from_keyword("/alkane/pair")
}

fn set_alkane_pair(&self, a: AlkaneId, b: AlkaneId) {
    StoragePointer::from_keyword("/alkane/0")
        .set(Arc::new(a.into()));
    StoragePointer::from_keyword("/alkane/1")
        .set(Arc::new(b.into()));
}

fn get_alkane_pair(&self) -> Result<(AlkaneId, AlkaneId)> {
    let a_bytes = StoragePointer::from_keyword("/alkane/0").get();
    let b_bytes = StoragePointer::from_keyword("/alkane/1").get();
    Ok((
        a_bytes.as_ref().clone().try_into()?,
        b_bytes.as_ref().clone().try_into()?,
    ))
}`}</CodeBlock>
      </Section>

      {/* Hierarchical Storage */}
      <Section title={t.hierarchicalTitle} id="hierarchical">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.hierarchicalDesc}</p>

        <CodeBlock>{`// Base pointer
let base = StoragePointer::from_keyword("/users/");

// Select by user address (appends bytes to path)
let user_key = user_address.as_bytes();
let user_ptr = base.select(user_key);

// Further nesting
let balance_ptr = user_ptr.select(b"/balance");
let stake_ptr = user_ptr.select(b"/stake");

// Practical example: User balances per token
fn balance_of(&self, user: &[u8], token: &AlkaneId) -> u128 {
    let token_bytes: Vec<u8> = token.clone().into();
    StoragePointer::from_keyword("/balances/")
        .select(user)
        .select(&token_bytes)
        .get_value::<u128>()
}

// Multi-level nesting for allowances
fn allowance(&self, owner: &[u8], spender: &[u8]) -> u128 {
    StoragePointer::from_keyword("/allowances/")
        .select(owner)
        .select(spender)
        .get_value::<u128>()
}

fn set_allowance(&self, owner: &[u8], spender: &[u8], amount: u128) {
    StoragePointer::from_keyword("/allowances/")
        .select(owner)
        .select(spender)
        .set_value::<u128>(amount);
}`}</CodeBlock>
      </Section>

      {/* Mapping Pattern */}
      <Section title={t.mappingTitle} id="mapping">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.mappingDesc}</p>

        <CodeBlock>{`// Simple mapping: hash -> bool (for tracking seen values)
pub fn seen_pointer(&self, hash: &[u8]) -> StoragePointer {
    StoragePointer::from_keyword("/seen/").select(hash)
}

pub fn is_seen(&self, hash: &[u8]) -> bool {
    self.seen_pointer(hash).get().len() > 0
}

pub fn mark_seen(&self, hash: &[u8]) {
    self.seen_pointer(hash).set_value::<u8>(1);
}

// Counter with unique key
pub fn nonce_pointer(&self, address: &[u8]) -> StoragePointer {
    StoragePointer::from_keyword("/nonces/").select(address)
}

pub fn get_and_increment_nonce(&self, address: &[u8]) -> u128 {
    let mut ptr = self.nonce_pointer(address);
    let current = ptr.get_value::<u128>();
    ptr.set_value::<u128>(current + 1);
    current
}

// Indexed list pattern
fn item_count(&self) -> u128 {
    StoragePointer::from_keyword("/items/count").get_value::<u128>()
}

fn item_at(&self, index: u128) -> Option<Vec<u8>> {
    let ptr = StoragePointer::from_keyword("/items/")
        .select(&index.to_le_bytes());
    let data = ptr.get();
    if data.len() > 0 {
        Some(data.as_ref().clone())
    } else {
        None
    }
}

fn push_item(&self, data: Vec<u8>) {
    let index = self.item_count();
    StoragePointer::from_keyword("/items/")
        .select(&index.to_le_bytes())
        .set(Arc::new(data));
    StoragePointer::from_keyword("/items/count")
        .set_value::<u128>(index + 1);
}`}</CodeBlock>
      </Section>

      {/* Initialization Pattern */}
      <Section title={t.initializationTitle} id="initialization">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.initializationDesc}</p>

        <CodeBlock>{`// Built-in initialization check (from AlkaneResponder trait)
fn observe_initialization(&self) -> Result<()> {
    let mut pointer = StoragePointer::from_keyword("/initialized");
    if pointer.get().len() == 0 {
        pointer.set_value::<u8>(0x01);
        Ok(())
    } else {
        Err(anyhow!("already initialized"))
    }
}

// Usage in your contract
impl MyContract {
    fn initialize(&self, name: String, symbol: String) -> Result<CallResponse> {
        // This will fail if called twice
        self.observe_initialization()?;

        // Safe to initialize state
        self.set_name(name);
        self.set_symbol(symbol);

        let context = self.context()?;
        Ok(CallResponse::forward(&context.incoming_alkanes))
    }
}

// Custom initialization flags for features
fn observe_feature_enabled(&self, feature: &str) -> Result<()> {
    let key = format!("/feature/{}/enabled", feature);
    let mut pointer = StoragePointer::from_keyword(&key);
    if pointer.get().len() == 0 {
        pointer.set_value::<u8>(0x01);
        Ok(())
    } else {
        Err(anyhow!("feature {} already enabled", feature))
    }
}`}</CodeBlock>
      </Section>

      {/* Pool Storage Example */}
      <Section title={t.poolStorageTitle} id="pool-example">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.poolStorageDesc}</p>

        <CodeBlock>{`// Real-world AMM pool storage layout
pub trait AMMPoolBase: MintableToken + AlkaneResponder {
    // Token pair
    fn alkanes_for_self(&self) -> Result<(AlkaneId, AlkaneId)> {
        Ok((
            StoragePointer::from_keyword("/alkane/0")
                .get().as_ref().clone().try_into()?,
            StoragePointer::from_keyword("/alkane/1")
                .get().as_ref().clone().try_into()?,
        ))
    }

    // Factory reference
    fn factory(&self) -> Result<AlkaneId> {
        let ptr = StoragePointer::from_keyword("/factory_id").get();
        ptr.as_ref().clone().try_into()
    }

    fn set_factory(&self, factory_id: AlkaneId) {
        StoragePointer::from_keyword("/factory_id")
            .set(Arc::new(factory_id.into()));
    }

    // Fee configuration
    fn total_fee_pointer(&self) -> StoragePointer {
        StoragePointer::from_keyword("/totalfeeper1000")
    }

    fn total_fee_per_1000(&self) -> u128 {
        let ptr = self.total_fee_pointer();
        if ptr.get().len() == 0 {
            3 // Default: 0.3% fee
        } else {
            ptr.get_value::<u128>()
        }
    }

    // Claimable protocol fees
    fn claimable_fees_pointer(&self) -> StoragePointer {
        StoragePointer::from_keyword("/claimablefees")
    }

    fn claimable_fees(&self) -> u128 {
        self.claimable_fees_pointer().get_value::<u128>()
    }

    // Time-weighted average price (TWAP) tracking
    fn price_cumulative_pointers(&self) -> (StoragePointer, StoragePointer) {
        (
            StoragePointer::from_keyword("/price0CumLast"),
            StoragePointer::from_keyword("/price1CumLast"),
        )
    }

    fn block_timestamp_last(&self) -> u32 {
        StoragePointer::from_keyword("/blockTimestampLast").get_value::<u32>()
    }

    // K-value for invariant tracking
    fn k_last_pointer(&self) -> StoragePointer {
        StoragePointer::from_keyword("/klast")
    }

    fn k_last(&self) -> U256 {
        self.k_last_pointer().get_value::<StorableU256>().into()
    }

    // Initialize all storage in one transaction
    fn init_pool(
        &self,
        alkane_a: AlkaneId,
        alkane_b: AlkaneId,
        factory: AlkaneId,
    ) -> Result<CallResponse> {
        self.observe_initialization()?;

        // Store token pair
        StoragePointer::from_keyword("/alkane/0")
            .set(Arc::new(alkane_a.into()));
        StoragePointer::from_keyword("/alkane/1")
            .set(Arc::new(alkane_b.into()));

        // Store factory
        self.set_factory(factory);

        // Initialize K to 0
        self.set_k_last(U256::from(0));

        // Add initial liquidity
        self.add_liquidity()
    }
}`}</CodeBlock>
      </Section>

      {/* Custom Types */}
      <Section title={t.customTypesTitle} id="custom-types">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.customTypesDesc}</p>

        <CodeBlock>{`use std::io::{Cursor, Read, Write};

// Custom type that can be stored
#[derive(Clone)]
pub struct UserInfo {
    pub balance: u128,
    pub last_claim: u64,
    pub multiplier: u32,
}

impl UserInfo {
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(28); // 16 + 8 + 4
        bytes.extend_from_slice(&self.balance.to_le_bytes());
        bytes.extend_from_slice(&self.last_claim.to_le_bytes());
        bytes.extend_from_slice(&self.multiplier.to_le_bytes());
        bytes
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < 28 {
            return Err(anyhow!("insufficient bytes for UserInfo"));
        }
        Ok(Self {
            balance: u128::from_le_bytes(bytes[0..16].try_into()?),
            last_claim: u64::from_le_bytes(bytes[16..24].try_into()?),
            multiplier: u32::from_le_bytes(bytes[24..28].try_into()?),
        })
    }
}

// Storage functions for custom type
fn user_info_pointer(&self, user: &[u8]) -> StoragePointer {
    StoragePointer::from_keyword("/userinfo/").select(user)
}

fn get_user_info(&self, user: &[u8]) -> Option<UserInfo> {
    let bytes = self.user_info_pointer(user).get();
    if bytes.len() == 0 {
        None
    } else {
        UserInfo::from_bytes(bytes.as_ref()).ok()
    }
}

fn set_user_info(&self, user: &[u8], info: &UserInfo) {
    self.user_info_pointer(user)
        .set(Arc::new(info.to_bytes()));
}

// Update a single field efficiently
fn update_user_balance(&self, user: &[u8], new_balance: u128) -> Result<()> {
    let mut info = self.get_user_info(user)
        .ok_or(anyhow!("user not found"))?;
    info.balance = new_balance;
    self.set_user_info(user, &info);
    Ok(())
}`}</CodeBlock>
      </Section>

      {/* Storage Path Conventions */}
      <Section title={t.storagePathsTitle} id="paths">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.storagePathsDesc}</p>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-[color:var(--sf-outline)] rounded-lg">
            <thead className="bg-[color:var(--sf-surface)]">
              <tr>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Path</th>
                <th className="text-left p-3 font-semibold text-[color:var(--sf-text)]">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.storagePaths.map((item, i) => (
                <tr key={i} className="border-t border-[color:var(--sf-outline)]">
                  <td className="p-3 font-mono text-[color:var(--sf-primary)]">{item.path}</td>
                  <td className="p-3 text-[color:var(--sf-muted)]">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Best Practices */}
      <Section title={t.bestPracticesTitle} id="best-practices">
        <div className="space-y-4">
          {t.bestPractices.map((item, i) => (
            <div key={i} className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <h4 className="font-semibold text-[color:var(--sf-text)] mb-1">{item.title}</h4>
              <p className="text-sm text-[color:var(--sf-muted)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Read Before Write */}
      <Section title={t.readBeforeWriteTitle} id="read-write">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.readBeforeWriteDesc}</p>

        <CodeBlock>{`use alkanes_support::utils::overflow_error;

// CORRECT: Read, modify, write with overflow check
fn increase_balance(&self, user: &[u8], amount: u128) -> Result<()> {
    let current = self.balance_pointer(user).get_value::<u128>();
    let new_balance = overflow_error(current.checked_add(amount))?;
    self.balance_pointer(user).set_value::<u128>(new_balance);
    Ok(())
}

fn decrease_balance(&self, user: &[u8], amount: u128) -> Result<()> {
    let current = self.balance_pointer(user).get_value::<u128>();
    let new_balance = overflow_error(current.checked_sub(amount))?;
    self.balance_pointer(user).set_value::<u128>(new_balance);
    Ok(())
}

// Transfer pattern: decrease from one, increase to another
fn transfer(&self, from: &[u8], to: &[u8], amount: u128) -> Result<()> {
    // Read both balances first
    let from_balance = self.balance_pointer(from).get_value::<u128>();
    let to_balance = self.balance_pointer(to).get_value::<u128>();

    // Check and calculate new values
    let new_from = overflow_error(from_balance.checked_sub(amount))?;
    let new_to = overflow_error(to_balance.checked_add(amount))?;

    // Write both values
    self.balance_pointer(from).set_value::<u128>(new_from);
    self.balance_pointer(to).set_value::<u128>(new_to);

    Ok(())
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
