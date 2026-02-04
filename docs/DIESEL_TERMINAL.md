# DIESEL Terminal v12

A Bloomberg-style terminal for calculating optimal DIESEL token minting strategy with minting, RBF, and wallet management features.

## Location

- **Component**: `components/DieselTerminal.tsx`
- **Page**: `app/[locale]/terminal/page.tsx`
- **URL**: `/terminal`

## Features

### 1. Header Status Bar

| Element | Description |
|---------|-------------|
| BLOCK | Current Bitcoin block height |
| TIME | Time since last block found (with color indication) |
| AVG | Average block time for current period (with tooltip showing blocks to adjustment) |
| NEXT BLOCK | Minimum fee to get into the next block (sat/vB) |
| QUEUE | Number of blocks in mempool queue |
| BTC/DSL | Wallet balance (refreshes every 5 minutes) |
| POOL | DIESEL price in satoshis from DIESEL/frBTC pool |

#### TIME Color Indication
- **Green** (< 10 min): Normal block time
- **Yellow** (10-30 min): Delayed block
- **Red** (> 30 min): Very long block

### 2. Strategy Parameters

| Parameter | Description |
|-----------|-------------|
| Block Reward (R) | Block reward in DIESEL |
| DSL Price | DIESEL price in satoshis (auto-sync with pool) |
| TX Cost | Cost of one mint in satoshis |
| Competition (M) | Number of competing mints (auto-scan) |

#### Effective Competition

When there's an active chain, effective M is calculated considering whether we're competing for the next block:

```typescript
// Subtract our chain only if we're competing for the next block
const weAreCompeting = currentEffectiveRate >= mempoolMinFee;
const chainToSubtract = weAreCompeting ? ourChainLength : 0;
const effective_M = scanned_M - chainToSubtract;
```

**Logic:**
- If our rate >= mempool minimum → we're competing → subtract our TXs
- If our rate < minimum → we're NOT competing for next block → don't subtract

**Example 1 (competing):**
- Scanner: 100 mints, our chain: 10 TX
- Our rate: 0.20 sat/vB, minimum: 0.15 sat/vB
- `0.20 >= 0.15` → competing
- Effective M = 100 - 10 = 90
- UI: `eff: 90`, footer: `M=100-10=90`

**Example 2 (not competing):**
- Scanner: 100 mints, our chain: 10 TX
- Our rate: 0.10 sat/vB, minimum: 0.15 sat/vB
- `0.10 < 0.15` → NOT competing
- Effective M = 100 (don't subtract, indicator not shown)

### 3. Calculation Formulas

```
N* = R × p / (2 × f)     # Threshold - breakeven point
n* = √(N* × M) - M       # Optimal number of mints
ROI = (√(N*/M) - 2) × 100%  # Return on Investment
Breakeven M = N* / 4      # Maximum competition for profit
```

### 4. EXECUTION Panel (Bloomberg-style)

Compact grid with metrics:

| Metric | Description |
|--------|-------------|
| n* | Optimal number of mints (editable) |
| ROI | Return on Investment (%) |
| EXP | Expected DIESEL to receive |
| COST | Total cost in sats |
| NET | Net profit/loss in sats |
| POOL | Pool allocation (R - 0.05 fee) |
| EMIT | Total emission to miners |
| PCTL | Your percentile of pool |
| $/DSL | Cost per DIESEL in sats |

### 5. Mempool Integration

#### Automatic Fee (AUTO-FEE)

Gets minimum fee for the next block from mempool.space API:

```typescript
const MEMPOOL_API = 'https://mempool.space/api/v1/fees/mempool-blocks';
// blocks[0].feeRange[0] = minimum fee to get into the next block
```

- Refreshes every 10 seconds
- Can set a cap (CAP) — if mempool > cap, uses cap
- Auto-disabled when TX Cost is manually changed

#### Competition Scanning (AUTO-SCAN)

Automatically counts DIESEL mints in mempool every 15 seconds:

```lua
local minFeeRate = tonumber(args[1]) or 1
local DIESEL_PREFIX = "6a5d1214011400"

local mempool = _RPC.btc_getrawmempool(true)

local dieselCount = 0
local totalMempool = 0
local qualifying = 0

for txid, entry in pairs(mempool) do
  totalMempool = totalMempool + 1

  -- Ancestor fee rate: can this TX get in with its parents?
  local ancestorFeeRate = (entry.fees.ancestor * 100000000) / entry.ancestorsize

  -- Descendant fee rate: can this TX get in via CPFP (child paying for it)?
  local descendantFeeRate = (entry.fees.descendant * 100000000) / entry.descendantsize

  -- TX qualifies if EITHER rate is high enough (with 10% buffer)
  local threshold = minFeeRate * 0.9

  if ancestorFeeRate >= threshold or descendantFeeRate >= threshold then
    qualifying = qualifying + 1
    local tx = _RPC.btc_getrawtransaction(txid, true)

    if tx and tx.vout then
      for _, output in ipairs(tx.vout) do
        if output.scriptPubKey and output.scriptPubKey.hex then
          if string.sub(output.scriptPubKey.hex, 1, 14) == DIESEL_PREFIX then
            dieselCount = dieselCount + 1
            break
          end
        end
      end
    end
  end
end

return {
  total_mempool = totalMempool,
  qualifying = qualifying,
  diesel_mints = dieselCount
}
```

### 6. DIESEL Minting

#### UTXO Selection

When multiple UTXOs are available, you can manually select which one to use for minting:

```
▶ UTXO (auto)           — automatic selection (default)
▼ UTXO (0.00045000 BTC) — specific UTXO selected

  a1b2c3d4...e5f6:0     45,000 sats
  f7e8d9c0...b1a2:1     12,500 sats  ← select
  ...
```

**When to use:**
- One UTXO is already in a chain
- Want to start a parallel chain from a different UTXO
- Control over which funds are spent
- Switching between multiple active chains

**API:** `esplora_address::utxo` via Subfrost RPC

**Important:** Selected UTXO persists between mints. This allows auto-mint to use the same UTXO for new cycles. Use `[clear]` to reset to auto-selection.

#### Multiple Chains

The terminal supports tracking multiple active chains simultaneously:

```
▼ UTXO (0.00045000 BTC) [2 chains]

  a1b2c3d4...:0   5tx    45,000 sats  ← active chain
  f7e8d9c0...:1   3tx    12,500 sats  ← another chain
  g2h3i4j5...:2          8,000 sats   ← no chain
```

- UTXOs with active chains are highlighted in purple
- Shows number of TXs in chain
- Selecting a UTXO loads its chain data (ACTIVE CHAIN, FEE BUMP)
- Each chain is tracked independently

#### Chained Transactions (CPFP pattern)

- Automatic creation of transaction chains
- Each TX spends output 0 of the previous TX
- Bitcoin limit: 25 unconfirmed ancestors
- We use 20 for minting + 5 reserved for CPFP bump

#### Transaction Structure

```
Input: P2TR UTXO with sequence: 0xfffffffd (RBF enabled)
Output 0: P2TR recipient (all sats minus fee)
Output 1: OP_RETURN with protostone (0 sats)
```

OP_RETURN for DIESEL mint:
```
6a5d1214011400ff7f818cec82d08bc0a88281d215
│ │ │
│ │ └── Protorune data (DIESEL contract)
│ └──── Protorune marker
└────── OP_RETURN
```

#### ACTIVE CHAIN Panel

Displayed after minting or chain detection:

| Metric | Description |
|--------|-------------|
| TXs: X/25 | Number of TXs in chain / limit (color: green→yellow→red) |
| FEES | Total chain fees in sats |
| RATE | Effective rate (sat/vB), red if < mempool |
| VIEW ↗ | Link to last TX on mempool.space |
| [CLEAR] | Clear chain data |

#### Chain Continuation

When there's an active chain, new mints are automatically added to it:

- First new TX uses the output of the last chain TX as input
- Data is updated with the sum of old + new chain
- 25 TX limit is checked before minting
- [CLEAR] button allows starting a new chain

```typescript
// When continuing a chain
nextUtxo = {
  txid: cpfpData.lastTxid,
  vout: 0,
  value: cpfpData.lastOutputValue,
  rawTxHex: cpfpData.lastRawTxHex,
};
// New TXs are added to existing ones
allTxids = [...existingTxids, ...newTxids];
totalFee = existingTotalFees + newTxsFee;
```

#### Chain Detection (DETECT CHAIN)

The DETECT CHAIN button finds ALL active chains for an address:

- Scans mempool via `mempool.space/api/address/{addr}/txs`
- Finds all DIESEL mints (by OP_RETURN pattern `6a5d1214011400`)
- Identifies the start of each chain (TX spending a confirmed UTXO)
- Saves each chain to `chainsMap` by source UTXO key

```typescript
// Chain storage structure
type ChainData = {
  mintResult: { txids: string[]; totalFee: number };
  rbfData: RbfData;    // Data for RBF
  cpfpData: CpfpData;  // Data for CPFP
};

// Key = txid:vout of source UTXO
const chainsMap = new Map<string, ChainData>();
```

**Behavior:**
- On startup: automatically detects chains
- When selecting UTXO: loads its chain data from `chainsMap`
- If no chain: clears ACTIVE CHAIN panel
- Multiple chains: each is tracked independently

#### Auto-Cleanup on Confirmation

The panel automatically disappears when the chain is mined:

- Every 30 seconds, checks the status of the last TX via `esplora_tx`
- If `status.confirmed === true`, all chain data is cleared
- Balances are refreshed automatically

```typescript
// Confirmation check via Subfrost RPC
const res = await fetch(RPC_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'esplora_tx',
    params: [cpfpData.lastTxid],
  }),
});
const data = await res.json();
if (data.result?.status?.confirmed) {
  // Clear chain data
}
```

### 7. Fee Bumping (RBF / CPFP)

Two methods for accelerating transactions in a unified interface:

#### Common Interface

The FEE BUMP panel shows both methods simultaneously with a shared target rate input:

```
┌─────────────────────────────────────────────────────────┐
│ FEE BUMP                    target rate: [____] sat/vB  │
├─────────────────────────────────────────────────────────┤
│ RBF   min: 0.15   [+10%]              [REPLACE]         │
├─────────────────────────────────────────────────────────┤
│ CPFP  [5/25]  → 0.15 (+48 sats)       [ADD CHILD]       │
└─────────────────────────────────────────────────────────┘
```

#### RBF (Replace-By-Fee)

Replaces the last TX in the chain with a higher-fee version.

Bitcoin RBF requires: `new_fee >= old_fee + (incremental_relay_fee × vsize)`

```typescript
// Calculate required fee for last TX
targetEffectiveRate = totalFees / totalVsize
newTotalFees = targetEffectiveRate × totalVsize
newLastTxFee = newTotalFees - feesExcludingLast
```

**RBF Advantages:**
- Doesn't add a new TX to the chain
- Doesn't increase total vsize
- More efficient for small bumps
- **+10%** button for quick bump to mempool rate × 1.1

#### CPFP (Child-Pays-For-Parent)

Creates a child TX with high fee that "pulls" the entire chain.

```typescript
// Calculate child TX fee to achieve target rate
newTotalVsize = currentVsize + childVsize
childFee = targetRate × newTotalVsize - currentTotalFees
actualRate = (currentFees + childFee) / newTotalVsize
```

**CPFP Advantages:**
- Works even if RBF is disabled
- Adds another DIESEL mint (+1 to pool participation)
- Useful when you need mint + acceleration
- Precise effective rate tuning (down to 0.01 sat/vB)

**Package Relay (Bitcoin Core 28+):**
Thanks to package relay, the child TX can have a very low individual fee
(even < 1 sat/vB) if the package effective rate is sufficient to get into a block.
This allows precise micro-bumps of the effective rate.

**CPFP Limitations:**
- Chain limit: 25 TX (Bitcoin mempool limit)
- Minimum fee: 1 sat (technical minimum)

**Result Preview:**
When entering target rate, the CPFP line shows:
- `→ 0.15` — actual rate that will be achieved
- `+48 sats` — child TX fee in satoshis

#### Interface Elements

| Element | Description |
|---------|-------------|
| target rate | Shared target rate input (sat/vB) |
| RBF: min | Minimum rate for RBF |
| RBF: +10% | Quick bump to mempool rate × 1.1 |
| RBF: REPLACE | Execute last TX replacement |
| CPFP: [X/25] | Remaining slots in chain |
| CPFP: → rate | Preview of resulting rate |
| CPFP: +N sats | Child TX fee |
| CPFP: ADD CHILD | Add child TX with mint |

#### Low Fee Warning

If the chain's effective rate is below the current mempool rate:

```
⚠ LOW FEE: X.XX < Y.YY sat/vB
  [BUMP → Z.ZZ]
```

### 8. Auto-Mint

Automated minting with fee rate control.

**Component:** `components/AutoMintPanel.tsx`

#### Parameters

| Parameter | Description |
|-----------|-------------|
| FEE RANGE | Fee rate range for entry (min - max sat/vB) |
| MINTS | Number of TXs to mint (1-25) |
| LIMIT | Session spending limit in sats (empty = no limit) |
| AUTO-RBF | Auto-bump when chain rate drops below mempool + buffer% |
| ON/OFF | Enable/disable automation |

#### How It Works

```
┌─────────────────────────────────────────────────────────┐
│ AUTO-MINT                                    [ON/OFF]   │
├─────────────────────────────────────────────────────────┤
│ FEE RANGE  [0.15] - [1.0] sat/vB      NOW: 0.18        │
│ MINTS      [10] / 25 max              AVAILABLE: 25     │
│ AUTO-RBF   [ON]  bump when rate drops below mempool     │
├─────────────────────────────────────────────────────────┤
│ MINTING 10 @ 0.18 sat/vB...                             │
└─────────────────────────────────────────────────────────┘
```

**Algorithm:**

1. Monitors current fee rate from mempool
2. When fee enters range [min, max]:
   - If no active chain → starts minting the specified number of TXs
   - If there's an active chain → shows status
3. After minting, waits for chain confirmation
4. When chain is confirmed → resets trigger → ready for new cycle

**Auto-RBF (10% buffer):**

When AUTO-RBF is enabled, the system proactively bumps the chain rate when it falls below mempool:

```typescript
const targetRate = currentFeeRate * 1.1;  // 10% buffer above mempool
if (currentEffectiveRate < targetRate) {
  // Trigger RBF to bump to targetRate
}
```

**Automatic Cycle:**
```
[Fee in range] → MINT → [Wait for confirmation] → [Confirmed] → [Reset] → [Fee in range?] → MINT → ...
```

**Session Spending Limit:**

Prevents overspending during automated minting sessions.

```
┌─────────────────────────────────────────────────────────┐
│ LIMIT  [10000] sats          SPENT 540 / 10,000  [RST] │
└─────────────────────────────────────────────────────────┘
```

- Set limit in sats (empty = unlimited)
- Tracks total spent: mints + RBF bumps
- Blocks operations when limit reached
- `[RST]` resets session counter

**Fee Calculation:**
```typescript
const feePerTx = Math.ceil(TX_VSIZE * feeRate);  // Per-TX fee (matches actual)
const totalCost = mintCount * feePerTx;          // Total for batch
```

**Stale Fee Detection:**

After chain confirmation, waits for fresh mempool data before new mint:

```typescript
// Store fee rate when chain confirms
feeAtConfirmation.current = currentFeeRate;
waitingForFreshFees.current = true;

// Wait until fee rate changes (fresh data)
if (Math.abs(currentFeeRate - feeAtConfirmation.current) > 0.001) {
  waitingForFreshFees.current = false;
  // Now safe to start new mint
}
```

**Confirmed UTXO Filter:**

Initial mint only uses confirmed UTXOs to prevent starting chains with unconfirmed outputs:

```typescript
const confirmedUtxos = utxos.filter(u => u.status?.confirmed === true);
if (confirmedUtxos.length === 0) {
  throw new Error("No confirmed UTXOs available");
}
```

Note: RBF/CPFP still uses unconfirmed outputs (by design — extends existing chain).

**Statuses:**

| Status | Description |
|--------|-------------|
| `WAIT: 0.10 < 0.15 sat/vB` | Fee below minimum |
| `WAIT: 2.50 > 1.0 sat/vB` | Fee above maximum |
| `MINTING 10 @ 0.18 sat/vB...` | Minting in progress |
| `ACTIVE: 10/25 TXs @ 0.18 sat/vB` | Active chain exists |
| `RBF: 0.14 → 0.17 sat/vB...` | Auto-RBF in progress |
| `RBF OK: now @ 0.17 sat/vB` | RBF completed |
| `CHAIN FULL: 25/25` | Chain is full |
| `CONFIRMED — waiting for fresh fees...` | Chain confirmed, waiting for fresh data |
| `LIMIT: need X sats, have Y` | Session limit reached |

**Usage Example:**

1. Set range: 0.15 - 0.5 sat/vB
2. Set count: 15 mints
3. Enable AUTO-RBF (recommended)
4. Enable AUTO-MINT
5. Wait for fee to enter the range
6. Chain of 15 TXs is automatically created
7. If mempool rate rises, auto-RBF keeps chain competitive

### 9. Wallet Menu

Dropdown menu with wallet functions:

| Action | Description |
|--------|-------------|
| MANAGE | Show modal with address and backup seed |
| COPY ADDRESS | Copy address to clipboard |
| LOCK | Lock wallet (disconnect) |

### 10. Deposit Modal

Modal for balance replenishment and backup:

- **QR code** (if available)
- **Address** with copy button
- **SHOW SEED PHRASE** — show mnemonic (requires password)

#### Backup Seed Phrase

1. Click "SHOW SEED PHRASE"
2. Enter wallet password
3. After verification, 12/24-word mnemonic is displayed
4. "COPY" button for copying

### 11. Strategy Matrix

Table with calculations for different M values:

| M | n* | ROI | Net Profit |
|---|-----|-----|------------|
| 1 | ... | ... | ... |
| 5 | ... | ... | ... |
| 10 | ... | ... | ... |
| 25 | ... | ... | ... |
| 50 | ... | ... | ... |
| 100 | ... | ... | ... |
| 250 | ... | ... | ... |
| 500 | ... | ... | ... |
| 1000 | ... | ... | ... |

## Constants

```typescript
const TX_VSIZE = 141;              // vsize of DIESEL mint transaction
const REFRESH_INTERVAL = 10000;    // 10 seconds between mempool fee updates
const COMPETITION_REFRESH_INTERVAL = 15000; // 15 seconds between competition scans
const BALANCE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes between balance updates
const RPC_URL = process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';
```

## RPC Methods

### Bitcoin RPC (via Subfrost)

| Method | Description |
|--------|-------------|
| `btc_getblockcount` | Current block height |
| `btc_getblockhash(height)` | Block hash by height |
| `btc_getblockheader(hash)` | Block header (including timestamp) |
| `btc_getrawmempool(true)` | All mempool txids with fee info |
| `btc_getrawtransaction(txid, true)` | Decoded transaction |
| `btc_sendrawtransaction(hex)` | Broadcast transaction |
| `lua_evalscript(script, ...args)` | Execute Lua script |

### External APIs

| API | Description |
|-----|-------------|
| `mempool.space/api/v1/fees/mempool-blocks` | Mempool fee data |
| `mempool.space/api/v1/mining/difficulty-adjustments/1m` | Difficulty adjustment data |
| `mempool.space/api/address/{addr}/utxo` | UTXOs for address |
| `mempool.space/api/tx/{txid}/hex` | Raw transaction hex |
| `/api/pools?pool=DIESEL_FRBTC` | Price from DIESEL/frBTC pool |

## Example btc_getrawmempool(true) Response

```json
{
  "txid123...": {
    "fees": {
      "base": 0.0000568,
      "ancestor": 0.0000568,
      "descendant": 0.0000568
    },
    "vsize": 142,
    "ancestorsize": 142,
    "descendantsize": 142,
    "weight": 565,
    "time": 1769824369,
    "height": 934413
  }
}
```

**Important:** BOTH rates are used to determine block inclusion:
- **Ancestor rate**: `fees.ancestor / ancestorsize` — can the TX get in with its parents
- **Descendant rate**: `fees.descendant / descendantsize` — can the TX get in via CPFP

## P2TR (Taproot) Signing

### Key Tweaking

For P2TR key-path spending, the private key must be **tweaked**:

```typescript
// X-only pubkey (32 bytes, without 1-byte prefix)
const xOnlyPubkey = taprootChild.publicKey.slice(1, 33);

// Tweak key for taproot key-path spend
const tweakedChild = taprootChild.tweak(
  bitcoin.crypto.taggedHash('TapTweak', xOnlyPubkey)
);

// Sign with tweaked key
psbt.signInput(i, tweakedChild);
```

### PSBT Construction for P2TR Inputs

```typescript
psbt.addInput({
  hash: utxo.txid,
  index: utxo.vout,
  sequence: 0xfffffffd, // RBF enabled
  witnessUtxo: {
    script: bitcoin.address.toOutputScript(address, network),
    value: BigInt(utxo.value),
  },
  tapInternalKey: publicKey.length === 33 ? publicKey.subarray(1) : publicKey,
});
```

## Dust Limits

| Address Type | Dust Limit |
|--------------|------------|
| P2TR (Taproot) | 330 sats |
| P2WPKH (Native SegWit) | 546 sats |

## Dependencies

- `bitcoinjs-lib` — transaction creation and signing
- `@bitcoinerlab/secp256k1` — ECC library for P2TR
- `@tanstack/react-query` — wallet data caching
- `mempool.space API` — fee and difficulty data
- `Subfrost RPC` — mempool scanning and broadcast
