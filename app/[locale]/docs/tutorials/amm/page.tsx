"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Build an AMM",
    subtitle: "Create an automated market maker with constant product formula",
    intro: "In this tutorial, you'll learn how to build an AMM (Automated Market Maker) using the OYL AMM architecture. We'll cover liquidity pools, the constant product formula, and swap mechanics.",

    conceptsTitle: "Key Concepts",
    concepts: [
      { name: "Constant Product", desc: "x * y = k - price automatically adjusts based on reserves" },
      { name: "Liquidity Pool", desc: "Users deposit token pairs and receive LP tokens" },
      { name: "LP Tokens", desc: "Represent share of pool, burned to withdraw liquidity" },
      { name: "Swap Fee", desc: "Small fee (0.3%) collected on each swap" },
      { name: "TWAP", desc: "Time-weighted average price for oracle functionality" },
    ],

    architectureTitle: "AMM Architecture",
    architectureDesc: "The OYL AMM uses a factory pattern with these components:",
    components: [
      { name: "Factory", desc: "Creates new pools and manages global settings" },
      { name: "Pool", desc: "Holds reserves, handles swaps, and mints LP tokens" },
      { name: "Router", desc: "Helper for multi-hop swaps and slippage protection (optional)" },
      { name: "Beacon Proxy", desc: "Allows upgrading pool logic across all pools" },
    ],

    poolStorageTitle: "Pool Storage Layout",
    poolStorageDesc: "Each pool stores the following state:",

    formulaTitle: "Constant Product Formula",
    formulaDesc: "The AMM maintains the invariant: reserve0 * reserve1 = k",

    addLiquidityTitle: "Adding Liquidity",
    addLiquidityDesc: "When users add liquidity, LP tokens are minted proportionally:",

    removeLiquidityTitle: "Removing Liquidity",
    removeLiquidityDesc: "Burn LP tokens to withdraw proportional share of reserves:",

    swapTitle: "Swap Implementation",
    swapDesc: "Execute a swap while maintaining the constant product invariant:",

    twapTitle: "TWAP Oracle",
    twapDesc: "Track cumulative prices for time-weighted average price calculations:",

    poolContractTitle: "Pool Contract",
    poolContractDesc: "Here's a simplified pool contract implementing core AMM functionality:",

    factoryContractTitle: "Factory Pattern",
    factoryContractDesc: "The factory creates and tracks all pools:",

    deploymentTitle: "Deployment Steps",
    deploymentDesc: "Deploy the AMM system in the following order:",
    deploymentSteps: [
      "Deploy auth token factory at [4, 65517]",
      "Deploy beacon proxy template at [4, 780993]",
      "Deploy factory logic at [4, 65524]",
      "Deploy pool logic at [4, 65520]",
      "Deploy upgradeable factory proxy at [4, 65522]",
      "Deploy upgradeable beacon for pools at [4, 65523]",
      "Initialize factory with pool beacon references",
      "Create pools via factory",
    ],

    createPoolTitle: "Creating a Pool",
    createPoolDesc: "Create a new liquidity pool through the factory:",

    swapExampleTitle: "Executing Swaps",
    swapExampleDesc: "Swap tokens through an existing pool:",

    flashSwapsTitle: "Flash Swaps",
    flashSwapsDesc: "Execute swaps where payment happens in callback (advanced):",

    feesTitle: "Fee Collection",
    feesDesc: "Protocol fees are collected and distributed to governance:",

    nextStepsTitle: "Next Steps",
    nextSteps: [
      { text: "Wrap BTC", href: "/docs/tutorials/wrap-btc", desc: "Get frBTC for trading" },
      { text: "Token Tutorial", href: "/docs/tutorials/token", desc: "Create tradeable tokens" },
      { text: "Deployment", href: "/docs/contracts/deployment", desc: "Deploy to mainnet" },
    ],
  },
  zh: {
    title: "构建 AMM",
    subtitle: "使用恒定乘积公式创建自动做市商",
    intro: "在本教程中，您将学习如何使用 OYL AMM 架构构建 AMM（自动做市商）。我们将介绍流动性池、恒定乘积公式和交换机制。",

    conceptsTitle: "关键概念",
    concepts: [
      { name: "恒定乘积", desc: "x * y = k - 价格根据储备自动调整" },
      { name: "流动性池", desc: "用户存入代币对并获得 LP 代币" },
      { name: "LP 代币", desc: "代表池中的份额，销毁以提取流动性" },
      { name: "交换费用", desc: "每次交换收取的小额费用（0.3%）" },
      { name: "TWAP", desc: "用于预言机功能的时间加权平均价格" },
    ],

    architectureTitle: "AMM 架构",
    architectureDesc: "OYL AMM 使用工厂模式，包含以下组件：",
    components: [
      { name: "工厂", desc: "创建新池并管理全局设置" },
      { name: "池", desc: "持有储备、处理交换并铸造 LP 代币" },
      { name: "路由器", desc: "多跳交换和滑点保护的辅助程序（可选）" },
      { name: "信标代理", desc: "允许跨所有池升级池逻辑" },
    ],

    poolStorageTitle: "池存储布局",
    poolStorageDesc: "每个池存储以下状态：",

    formulaTitle: "恒定乘积公式",
    formulaDesc: "AMM 维护不变量：reserve0 * reserve1 = k",

    addLiquidityTitle: "添加流动性",
    addLiquidityDesc: "当用户添加流动性时，按比例铸造 LP 代币：",

    removeLiquidityTitle: "移除流动性",
    removeLiquidityDesc: "销毁 LP 代币以提取储备的比例份额：",

    swapTitle: "交换实现",
    swapDesc: "在维护恒定乘积不变量的同时执行交换：",

    twapTitle: "TWAP 预言机",
    twapDesc: "跟踪累计价格以进行时间加权平均价格计算：",

    poolContractTitle: "池合约",
    poolContractDesc: "以下是实现核心 AMM 功能的简化池合约：",

    factoryContractTitle: "工厂模式",
    factoryContractDesc: "工厂创建并跟踪所有池：",

    deploymentTitle: "部署步骤",
    deploymentDesc: "按以下顺序部署 AMM 系统：",
    deploymentSteps: [
      "在 [4, 65517] 部署认证代币工厂",
      "在 [4, 780993] 部署信标代理模板",
      "在 [4, 65524] 部署工厂逻辑",
      "在 [4, 65520] 部署池逻辑",
      "在 [4, 65522] 部署可升级工厂代理",
      "在 [4, 65523] 部署池的可升级信标",
      "使用池信标引用初始化工厂",
      "通过工厂创建池",
    ],

    createPoolTitle: "创建池",
    createPoolDesc: "通过工厂创建新的流动性池：",

    swapExampleTitle: "执行交换",
    swapExampleDesc: "通过现有池交换代币：",

    flashSwapsTitle: "闪电交换",
    flashSwapsDesc: "执行在回调中付款的交换（高级）：",

    feesTitle: "费用收集",
    feesDesc: "协议费用被收集并分配给治理：",

    nextStepsTitle: "下一步",
    nextSteps: [
      { text: "封装 BTC", href: "/docs/tutorials/wrap-btc", desc: "获取 frBTC 进行交易" },
      { text: "代币教程", href: "/docs/tutorials/token", desc: "创建可交易代币" },
      { text: "部署", href: "/docs/contracts/deployment", desc: "部署到主网" },
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

export default function AMMTutorialPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-sm text-[color:var(--sf-primary)] mb-4">{t.subtitle}</p>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      {/* Key Concepts */}
      <Section title={t.conceptsTitle} id="concepts">
        <div className="grid gap-3 md:grid-cols-2">
          {t.concepts.map((c, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <span className="font-semibold text-[color:var(--sf-primary)]">{c.name}</span>
              <span className="text-[color:var(--sf-muted)] ml-2">- {c.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Architecture */}
      <Section title={t.architectureTitle} id="architecture">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.architectureDesc}</p>
        <div className="space-y-2">
          {t.components.map((c, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <span className="font-mono text-[color:var(--sf-primary)]">{c.name}</span>
              <span className="text-[color:var(--sf-muted)] ml-2">- {c.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Pool Storage */}
      <Section title={t.poolStorageTitle} id="storage">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.poolStorageDesc}</p>
        <CodeBlock>{`// Pool storage layout
/alkane/0          -> AlkaneId: First token in pair
/alkane/1          -> AlkaneId: Second token in pair
/factory_id        -> AlkaneId: Factory that created this pool
/totalsupply       -> u128: LP token total supply
/klast             -> U256: k value after last operation
/totalfeeper1000   -> u128: Fee rate (3 = 0.3%)
/blockTimestampLast-> u32: Last update timestamp
/price0CumLast     -> U256: Cumulative price 0
/price1CumLast     -> U256: Cumulative price 1
/claimablefees     -> u128: Unclaimed protocol fees
/name              -> String: LP token name`}</CodeBlock>
      </Section>

      {/* Constant Product Formula */}
      <Section title={t.formulaTitle} id="formula">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.formulaDesc}</p>
        <CodeBlock>{`// Constant Product: x * y = k
//
// When swapping dx for dy:
// (x + dx) * (y - dy) = k
// dy = y - k/(x + dx)
// dy = y * dx / (x + dx)  (simplified, ignoring fees)
//
// With 0.3% fee:
// dx_with_fee = dx * (1000 - 3) / 1000
// dy = y * dx_with_fee / (x + dx_with_fee)

fn get_amount_out(
    amount_in: u128,
    reserve_in: u128,
    reserve_out: u128,
    fee_per_1000: u128,
) -> Result<u128> {
    if amount_in == 0 {
        return Err(anyhow!("INSUFFICIENT_INPUT_AMOUNT"));
    }
    if reserve_in == 0 || reserve_out == 0 {
        return Err(anyhow!("INSUFFICIENT_LIQUIDITY"));
    }

    // amount_in with fee applied
    let amount_in_with_fee = U256::from(amount_in) * U256::from(1000 - fee_per_1000);

    // Calculate output amount
    let numerator = amount_in_with_fee * U256::from(reserve_out);
    let denominator = U256::from(reserve_in) * U256::from(1000) + amount_in_with_fee;

    let amount_out: u128 = (numerator / denominator).try_into()?;
    Ok(amount_out)
}`}</CodeBlock>
      </Section>

      {/* Add Liquidity */}
      <Section title={t.addLiquidityTitle} id="add-liquidity">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.addLiquidityDesc}</p>
        <CodeBlock>{`fn add_liquidity(&self) -> Result<CallResponse> {
    let context = self.context()?;
    let parcel = context.incoming_alkanes.clone();

    // Verify exactly 2 tokens sent (the pair tokens)
    self.check_inputs(&context.myself, &parcel, 2)?;

    // Get current and previous reserves
    let (reserve_a, reserve_b) = self.reserves()?;
    let (previous_a, previous_b) = self.previous_reserves(&parcel)?;

    // Calculate amounts deposited
    let amount_a_in = reserve_a.value - previous_a.value;
    let amount_b_in = reserve_b.value - previous_b.value;

    // Mint protocol fee share if applicable
    self._mint_fee(previous_a.value, previous_b.value)?;

    let total_supply = self.total_supply();
    let liquidity: u128;

    if total_supply == 0 {
        // First deposit: LP tokens = sqrt(amount_a * amount_b) - MINIMUM_LIQUIDITY
        let root_k = (U256::from(amount_a_in) * U256::from(amount_b_in)).sqrt();
        liquidity = root_k.try_into::<u128>()? - MINIMUM_LIQUIDITY;

        // Lock MINIMUM_LIQUIDITY forever to prevent price manipulation
        self.set_total_supply(MINIMUM_LIQUIDITY);
    } else {
        // Subsequent deposits: mint proportional to smaller ratio
        let liquidity_a = U256::from(amount_a_in) * U256::from(total_supply)
            / U256::from(previous_a.value);
        let liquidity_b = U256::from(amount_b_in) * U256::from(total_supply)
            / U256::from(previous_b.value);

        liquidity = min(liquidity_a, liquidity_b).try_into()?;
    }

    if liquidity == 0 {
        return Err(anyhow!("INSUFFICIENT_LIQUIDITY_MINTED"));
    }

    // Update TWAP oracle
    self._update_cum_prices(previous_a.value, previous_b.value)?;

    // Update k value
    let new_k = U256::from(reserve_a.value) * U256::from(reserve_b.value);
    self.set_k_last(new_k);

    // Return minted LP tokens
    let mut response = CallResponse::default();
    response.alkanes.pay(self.mint(&context, liquidity)?);
    Ok(response)
}`}</CodeBlock>
      </Section>

      {/* Remove Liquidity */}
      <Section title={t.removeLiquidityTitle} id="remove-liquidity">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.removeLiquidityDesc}</p>
        <CodeBlock>{`fn withdraw_and_burn(&self) -> Result<CallResponse> {
    let context = self.context()?;
    let parcel = context.incoming_alkanes;

    // Verify exactly 1 token sent (LP token)
    self.check_inputs(&context.myself, &parcel, 1)?;

    let incoming = parcel.0[0].clone();
    if incoming.id != context.myself {
        return Err(anyhow!("can only burn LP alkane for this pair"));
    }

    let liquidity = incoming.value;
    let (previous_a, previous_b) = self.previous_reserves(&parcel)?;

    // Mint protocol fee
    self._mint_fee(previous_a.value, previous_b.value)?;

    let (reserve_a, reserve_b) = self.reserves()?;
    let total_supply = self.total_supply();

    // Calculate withdrawal amounts proportional to LP tokens
    let amount_a: u128 = (U256::from(liquidity) * U256::from(reserve_a.value)
        / U256::from(total_supply)).try_into()?;
    let amount_b: u128 = (U256::from(liquidity) * U256::from(reserve_b.value)
        / U256::from(total_supply)).try_into()?;

    if amount_a == 0 || amount_b == 0 {
        return Err(anyhow!("INSUFFICIENT_LIQUIDITY_BURNED"));
    }

    // Burn LP tokens
    self.decrease_total_supply(liquidity)?;

    // Update TWAP oracle
    self._update_cum_prices(previous_a.value, previous_b.value)?;

    // Update k value
    let new_k = U256::from(reserve_a.value - amount_a)
        * U256::from(reserve_b.value - amount_b);
    self.set_k_last(new_k);

    // Return withdrawn tokens
    let mut response = CallResponse::default();
    response.alkanes = AlkaneTransferParcel(vec![
        AlkaneTransfer { id: reserve_a.id, value: amount_a },
        AlkaneTransfer { id: reserve_b.id, value: amount_b },
    ]);
    Ok(response)
}`}</CodeBlock>
      </Section>

      {/* Swap */}
      <Section title={t.swapTitle} id="swap">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.swapDesc}</p>
        <CodeBlock>{`fn swap(
    &self,
    amount_0_out: u128,
    amount_1_out: u128,
    to: AlkaneId,
    data: Vec<u128>,
) -> Result<CallResponse> {
    // Validate outputs
    if amount_0_out == 0 && amount_1_out == 0 {
        return Err(anyhow!("INSUFFICIENT_OUTPUT_AMOUNT"));
    }

    let context = self.context()?;
    let parcel = context.incoming_alkanes.clone();

    // Get reserves before incoming tokens were added
    let (reserve_0, reserve_1) = self.previous_reserves(&parcel)?;

    // Check sufficient liquidity
    if amount_0_out >= reserve_0.value || amount_1_out >= reserve_1.value {
        return Err(anyhow!("INSUFFICIENT_LIQUIDITY"));
    }

    // Prevent sending to token addresses
    if to == reserve_0.id || to == reserve_1.id {
        return Err(anyhow!("INVALID_TO"));
    }

    // Build output parcel
    let mut alkane_transfer = AlkaneTransferParcel::default();
    if amount_0_out > 0 {
        alkane_transfer.0.push(AlkaneTransfer {
            id: reserve_0.id.clone(),
            value: amount_0_out,
        });
    }
    if amount_1_out > 0 {
        alkane_transfer.0.push(AlkaneTransfer {
            id: reserve_1.id.clone(),
            value: amount_1_out,
        });
    }

    // Handle flash swaps (callback) or regular swaps
    let mut response = CallResponse::default();
    let should_send_to_extcall = !data.is_empty() && to != AlkaneId::new(0, 0);

    if should_send_to_extcall {
        // Flash swap: call recipient with tokens, expect payment in callback
        let mut extcall_input = vec![SWAP_EXTCALL_OPCODE];
        extcall_input.extend(context.caller.clone().into_iter());
        extcall_input.push(amount_0_out);
        extcall_input.push(amount_1_out);
        extcall_input.extend(data);

        self.call(
            &Cellpack { target: to, inputs: extcall_input },
            &alkane_transfer,
            self.fuel(),
        )?;
    } else {
        // Regular swap: return tokens directly
        response.alkanes = alkane_transfer;
    }

    // Calculate new balances
    let (mut balance_0, mut balance_1) = self.reserves()?;
    if !should_send_to_extcall {
        balance_0.value -= amount_0_out;
        balance_1.value -= amount_1_out;
    }

    // Calculate input amounts
    let amount_0_in = if balance_0.value > reserve_0.value - amount_0_out {
        balance_0.value - (reserve_0.value - amount_0_out)
    } else { 0 };

    let amount_1_in = if balance_1.value > reserve_1.value - amount_1_out {
        balance_1.value - (reserve_1.value - amount_1_out)
    } else { 0 };

    if amount_0_in == 0 && amount_1_in == 0 {
        return Err(anyhow!("INSUFFICIENT_INPUT_AMOUNT"));
    }

    // Verify K invariant with fees
    let total_fee = self.total_fee_per_1000();
    let balance_0_adjusted = U256::from(balance_0.value) * U256::from(1000)
        - U256::from(amount_0_in) * U256::from(total_fee);
    let balance_1_adjusted = U256::from(balance_1.value) * U256::from(1000)
        - U256::from(amount_1_in) * U256::from(total_fee);

    if balance_0_adjusted * balance_1_adjusted
        < U256::from(reserve_0.value) * U256::from(reserve_1.value) * U256::from(1000000) {
        return Err(anyhow!("K is not maintained"));
    }

    // Update TWAP oracle
    self._update_cum_prices(reserve_0.value, reserve_1.value)?;

    Ok(response)
}`}</CodeBlock>
      </Section>

      {/* TWAP */}
      <Section title={t.twapTitle} id="twap">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.twapDesc}</p>
        <CodeBlock>{`fn _update_cum_prices(&self, reserve0: u128, reserve1: u128) -> Result<()> {
    let block_header = self.block_header()?;
    let current_timestamp = block_header.time;
    let last_timestamp = self.block_timestamp_last();

    let time_elapsed = current_timestamp - last_timestamp;

    // Only update if time has passed and reserves exist
    if time_elapsed > 0 && reserve0 != 0 && reserve1 != 0 {
        // Price0 = reserve1 / reserve0 (scaled by 2^128)
        // Price1 = reserve0 / reserve1 (scaled by 2^128)
        let price0_cumulative = (U256::from(reserve1) << 128)
            / U256::from(reserve0) * U256::from(time_elapsed);
        let price1_cumulative = (U256::from(reserve0) << 128)
            / U256::from(reserve1) * U256::from(time_elapsed);

        self.increase_price_cumulative(price0_cumulative, price1_cumulative);
    }

    self.set_block_timestamp_last(current_timestamp);
    Ok(())
}

// External function to read TWAP
fn get_price_cumulative_last(&self) -> Result<CallResponse> {
    let context = self.context()?;
    let mut response = CallResponse::forward(&context.incoming_alkanes);

    let (p0, p1) = self.price_cumulative();
    response.data.extend_from_slice(&p0.to_le_bytes::<32>());
    response.data.extend_from_slice(&p1.to_le_bytes::<32>());

    Ok(response)
}`}</CodeBlock>
      </Section>

      {/* Deployment */}
      <Section title={t.deploymentTitle} id="deployment">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.deploymentDesc}</p>
        <div className="space-y-2 mb-4">
          {t.deploymentSteps.map((step, i) => (
            <div key={i} className="p-2 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)]">
              <span className="font-mono text-[color:var(--sf-primary)] mr-2">{i + 1}.</span>
              <span className="text-[color:var(--sf-muted)]">{step}</span>
            </div>
          ))}
        </div>

        <CodeBlock language="bash">{`# 1. Deploy Auth Token Factory
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes execute "[3,65517,100]:v0:v0" \\
  --envelope ./alkanes_std_auth_token.wasm \\
  --from p2tr:0 --fee-rate 1 --mine -y

# 2. Deploy Pool Beacon Proxy Template
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes execute "[3,780993,36863]:v0:v0" \\
  --envelope ./alkanes_std_beacon_proxy.wasm \\
  --from p2tr:0 --fee-rate 1 --mine -y

# 3. Deploy Factory Logic
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes execute "[3,65524,50]:v0:v0" \\
  --envelope ./factory.wasm \\
  --from p2tr:0 --fee-rate 1 --mine -y

# 4. Deploy Pool Logic
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes execute "[3,65520,50]:v0:v0" \\
  --envelope ./pool.wasm \\
  --from p2tr:0 --fee-rate 1 --mine -y

# 5. Deploy Upgradeable Factory Proxy
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes execute "[3,65522,32767,4,65524,5]:v0:v0" \\
  --envelope ./alkanes_std_upgradeable.wasm \\
  --from p2tr:0 --fee-rate 1 --mine -y

# 6. Deploy Pool Upgradeable Beacon
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes execute "[3,65523,32767,4,65520,5]:v0:v0" \\
  --envelope ./alkanes_std_upgradeable_beacon.wasm \\
  --from p2tr:0 --fee-rate 1 --mine -y

# 7. Initialize Factory
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes execute "[4,65522,0,780993,4,65523]:v0:v0" \\
  --inputs 2:1:1 \\
  --from p2tr:0 --fee-rate 1 --mine -y`}</CodeBlock>
      </Section>

      {/* Create Pool */}
      <Section title={t.createPoolTitle} id="create-pool">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.createPoolDesc}</p>
        <CodeBlock language="bash">{`# Create DIESEL/frBTC pool
alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes init-pool \\
  --pair "2:0,32:0" \\
  --liquidity "300000000:50000" \\
  --to p2tr:0 \\
  --from p2tr:0 \\
  --change p2tr:0 \\
  --factory "4:65522" \\
  --mine \\
  -y

# The pool will be created at the next available [2, n]
# LP tokens will be sent to your address`}</CodeBlock>
      </Section>

      {/* Swap Example */}
      <Section title={t.swapExampleTitle} id="swap-example">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.swapExampleDesc}</p>
        <CodeBlock language="bash">{`# Swap DIESEL for frBTC
# Pool ID: 2:12345 (replace with actual pool ID)

alkanes-cli -p regtest \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "password" \\
  alkanes swap \\
  --pool "2:12345" \\
  --amount-in "1000000" \\
  --token-in "2:0" \\
  --min-out "900" \\
  --to p2tr:0 \\
  --from p2tr:0 \\
  --mine \\
  -y

# Query pool reserves
alkanes-cli -p regtest alkanes simulate "2:12345:97"

# Query LP token total supply
alkanes-cli -p regtest alkanes simulate "2:12345:101"`}</CodeBlock>
      </Section>

      {/* Flash Swaps */}
      <Section title={t.flashSwapsTitle} id="flash-swaps">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.flashSwapsDesc}</p>
        <CodeBlock>{`// Flash swap callback contract
#[derive(MessageDispatch)]
pub enum FlashSwapMessage {
    // Callback from pool during flash swap
    #[opcode(73776170)] // "swap" as u128
    OnSwap {
        sender: AlkaneId,
        amount_0_out: u128,
        amount_1_out: u128,
        data_len: u128,
        // ... data follows
    },
}

impl MyFlashSwapContract {
    fn on_swap(
        &self,
        sender: AlkaneId,
        amount_0_out: u128,
        amount_1_out: u128,
        data_len: u128,
    ) -> Result<CallResponse> {
        let context = self.context()?;

        // Use the borrowed tokens for arbitrage, liquidations, etc.
        // ...

        // Calculate repayment (must return more than borrowed)
        let fee = 3; // 0.3%
        let repay_amount = amount_0_out * (1000 + fee) / 1000;

        // Return tokens to pool
        let mut response = CallResponse::default();
        response.alkanes.0.push(AlkaneTransfer {
            id: /* token_0_id */,
            value: repay_amount,
        });

        Ok(response)
    }
}`}</CodeBlock>
      </Section>

      {/* Fees */}
      <Section title={t.feesTitle} id="fees">
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.feesDesc}</p>
        <CodeBlock>{`fn collect_fees(&self) -> Result<CallResponse> {
    // Only factory can collect fees
    self._only_factory_caller()?;

    let context = self.context()?;
    let (previous_a, previous_b) = self.previous_reserves(&context.incoming_alkanes)?;

    // Calculate and mint fee share
    self._mint_fee(previous_a.value, previous_b.value)?;

    // Transfer claimable fees as LP tokens
    let mut response = CallResponse::forward(&context.incoming_alkanes);
    response.alkanes.pay(AlkaneTransfer {
        id: context.myself,
        value: self.claimable_fees(),
    });

    // Reset claimable fees
    self.set_claimable_fees(0);

    // Update k
    let new_k = U256::from(previous_a.value) * U256::from(previous_b.value);
    self.set_k_last(new_k);

    Ok(response)
}

// Fee calculation (Uniswap v2 style)
fn _mint_fee(&self, previous_a: u128, previous_b: u128) -> Result<()> {
    let total_supply = self.total_supply();
    let k_last = self.k_last();

    if !k_last.is_zero() {
        let root_k = (U256::from(previous_a) * U256::from(previous_b)).sqrt();
        let root_k_last = k_last.sqrt();

        if root_k > root_k_last {
            // Mint fee share to protocol
            let numerator = U256::from(total_supply) * (root_k - root_k_last);
            let total_fee = self.total_fee_per_1000();
            let denominator = root_k * U256::from(total_fee - 1) / U256::from(1)
                + root_k_last;
            let liquidity: u128 = (numerator / denominator).try_into()?;

            self.increase_total_supply(liquidity)?;
            self.set_claimable_fees(self.claimable_fees() + liquidity);
        }
    }
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
