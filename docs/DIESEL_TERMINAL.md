# DIESEL Terminal v13

A Bloomberg-style terminal for parallel multi-chain DIESEL token minting with auto-mint, RBF, and wallet management features.

## Location

- **Component**: `components/DieselTerminal.tsx` — main terminal (~2300 lines)
- **Sub-components**: `components/diesel-terminal/` — types, constants, hooks, modals
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

### 2. Mempool Integration

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

Automatically counts DIESEL mints in the next block every 15 seconds.

**Architecture:** Uses `btc_getblocktemplate` RPC — returns the exact block a miner would build, with raw TX hex for every transaction. The server searches each TX for the DIESEL OP_RETURN prefix via `string.includes`. No Lua scripts, no `getrawtransaction` calls. Result is cached in Redis (TTL 15s) since it's identical for all users.

```
Client A ──► /api/competition ──► Redis cache hit  → instant response
Client B ──► /api/competition ──► Redis cache hit  → instant response
Client C ──► /api/competition ──► Redis cache miss → btc_getblocktemplate → cache 15s → response
```

**Why `getblocktemplate`:**
- **1 RPC call** instead of thousands (`getrawmempool` + `getrawtransaction` per TX)
- **Exact** block composition — fee rate sorting and block size limit already applied by the miner
- **No threshold tuning** — no `minFeeRate` parameter, no 0.9x buffer, no histogram estimation

**Key files:**
- `app/api/competition/route.ts` — server-side API endpoint (direct RPC, no Lua)
- `components/DieselTerminal.tsx` — client polling (`scanForDieselMints`)

**Cache key:** `competition:scan`

**Client call:**
```typescript
const res = await fetch('/api/competition');
const data = await res.json();
// data.data = { next_block_txs, diesel_mints }
```

**Server logic** (in `app/api/competition/route.ts`):
- Calls `btc_getblocktemplate({ rules: ["segwit"] })` — returns ~3000-5000 TXs with raw hex
- Searches each `tx.data` for DIESEL prefix `6a5d1214011400` via `string.includes`
- Returns `{ next_block_txs, diesel_mints }`

### 3. DIESEL Minting

#### Multi-Chain Architecture

The terminal supports **parallel multi-chain minting** — multiple independent TX chains running simultaneously, each with its own config. All chains are stored in `chainsMap: Map<string, ChainData>` keyed by source UTXO (`txid:vout`).

**Key files:**
- `components/diesel-terminal/types.ts` — `ChainData`, `ChainConfig`, `ChainAutoState`, `RbfData`
- `components/diesel-terminal/constants.ts` — `TX_VSIZE`, `MAX_CHAIN_LENGTH`, `DEFAULT_CHAIN_CONFIG`
- `components/diesel-terminal/useMultiChainAutoMint.ts` — per-chain auto-mint/RBF state machine
- `components/diesel-terminal/useActionQueue.ts` — FIFO queue for sequential wallet signing
- `components/diesel-terminal/UtxoSelectorModal.tsx` — UTXO picker + per-chain config
- `components/diesel-terminal/ChainConfigEditor.tsx` — inline config editor

#### UTXO Selector Modal

New chains are launched via `[+ CHAIN]` button which opens `UtxoSelectorModal`:

```
┌─────────────────────────────────────────────┐
│ NEW CHAIN                            [ESC]  │
├─────────────────────────────────────────────┤
│ SELECT UTXO                      [REFRESH]  │
│ ● abc1..23:0          50,000       OK       │
│ ○ def4..56:1         120,000       OK       │
│   789g..hi:0          80,000       USED     │
│   jkl0..12:2           2,000       SMALL    │
├─────────────────────────────────────────────┤
│ CHAIN CONFIG                                │
│ MINTS: [20]  FEE: [0.15]—[2.3] sat/vB      │
│ RBF: [ON] +[10]%   RESTART: [ON]           │
├─────────────────────────────────────────────┤
│              [LAUNCH]                       │
└─────────────────────────────────────────────┘
```

- **Conflict detection**: UTXOs already in `chainsMap` are disabled (USED)
- **Dust filter**: `value < 330 + ceil(TX_VSIZE × maxRate × mintCount)` → disabled (SMALL)
- **Config**: inherits from `defaultConfig`, editable per-chain before launch

#### Action Queue

Wallet signs one PSBT at a time → all actions from all chains go into a FIFO queue:

```
Chain A: needs RBF  ──┐
                      ├──→ [Queue: A:rbf, B:mint] ──→ Executor (one at a time)
Chain B: needs mint ──┘
```

- `isProcessingAction` — global flag, blocks new actions while executing
- Deduplication: no duplicate `utxoKey+type` in queue

#### Chained Transactions (CPFP pattern)

- Automatic creation of transaction chains
- Each TX spends output 0 of the previous TX
- Bitcoin mempool limit: 25 unconfirmed ancestors
- Configurable per-chain via `mintCount` (1-25)

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
type ChainData = {
  mintResult: { txids: string[]; totalFee: number };
  rbfData: RbfData;        // Data for RBF (includes preRbfTotalFees, preRbfLastTxid)
  cpfpData: CpfpData;      // Data for CPFP
  config: ChainConfig;     // Per-chain settings (mintCount, feeRange, autoRbf, etc.)
  autoState: ChainAutoState; // Per-chain state machine (enabled, triggered, errorCount, etc.)
  sourceUtxo?: UtxoInput;  // Original UTXO value — stored to avoid wallet cache dependency
};

// Key = txid:vout of source UTXO
const chainsMap = new Map<string, ChainData>();
```

**Behavior:**
- On startup: automatically detects chains via mempool scan
- New chains: launched via `[+ CHAIN]` → UtxoSelectorModal
- Each chain tracked independently with its own config and auto-state
- `sourceUtxo` prevents "Insufficient funds: 0 sats" when wallet cache times out

#### Auto-Cleanup & Auto-Restart on Confirmation

The `checkAllChains` useEffect monitors all chains for confirmation:

- Runs every 30 seconds + on each new block + retries at 2s, 5s, 10s
- For each chain: checks `cpfpData.lastTxid` via `esplora_tx`
- If confirmed → removes chain from `chainsMap` + optionally auto-restarts

**Auto-Restart:**

When `config.autoRestart && autoMintGlobalEnabled`:
- **Normal confirmation**: new chain on `lastTxid:0` with `sourceUtxo` from `cpfpData.lastOutputValue`
- **RBF-lost-race**: new chain on `rbfData.preRbfLastTxid:0`, no `sourceUtxo` (fetched from wallet)
- Both cases start with `waitingForFreshFees: true` (30s timeout)

**RBF Race Condition Handling:**

After an RBF, `cpfpData.lastTxid` points to the replacement TX and `mintResult.txids[last]` is also the RBF txid (replaced by `handleRbfForChain`). If a block confirms the ORIGINAL chain before the RBF propagates, three detection layers handle it:

**Layer 1 — lastTxid check** (always runs):
- `esplora_tx(cpfpData.lastTxid)` — if confirmed → normal completion

**Layer 2 — lastTxid evicted** (walk backwards):
- If `esplora_tx(lastTxid)` returns not found → walk chain backwards (restoring `preRbfLastTxid` as last element)
- Find last valid TX → if confirmed → restart on its output
- If still in mempool → RESTORE chain (trim to valid TXs)

**Layer 3 — preRbfLastTxid cross-check** (RBF was done, lastTxid still cached as unconfirmed):
- If `preRbfLastTxid !== null && preRbfLastTxid !== lastTxid`:
  - `esplora_tx(preRbfLastTxid)` → if confirmed → RBF-lost-race → restart on `preRbfLastTxid:0`

**Layer 4 — firstTxid cross-check** (esplora lagging on later TXs):
- If `txids[0] !== lastTxid` (chain has >1 TX):
  - `esplora_tx(txids[0])` → if confirmed → entire chain is in a block
  - Restart on `preRbfLastTxid:0` (if RBF) or `lastTxid:0` (no RBF)
- This catches the case where esplora caches both the RBF TX (unconfirmed) and the original last TX (unconfirmed) but the first TX already shows as confirmed

**Same firstTxid cross-check in `checkChainAndRestart`** (called on "missingorspent" broadcast error):
- Walk backwards finds last valid TX as unconfirmed → additionally checks `txids[0]`
- If `txids[0]` confirmed → treat entire chain as confirmed → restart

**Critical**: After RBF, `mintResult.txids = [TX1, TX2, ..., TX_RBF]` — the original last txid is **lost** from the array. It's preserved in `rbfData.preRbfLastTxid` for correct auto-restart UTXO.

**Key fields in `RbfData`:**
- `preRbfTotalFees: number | null` — total fees before first RBF (for SPENT correction on RBF-lost-race)
- `preRbfLastTxid: string | null` — original last txid before first RBF (for correct restart UTXO)

### 4. Fee Bumping (RBF / CPFP)

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

### 5. Auto-Mint (Multi-Chain)

Automated multi-chain minting with per-chain fee rate control.

**UI Component:** `components/AutoMintPanel.tsx` — pure UI panel (global toggle, default config, session limit)
**Logic Hook:** `components/diesel-terminal/useMultiChainAutoMint.ts` — per-chain state machine

#### Architecture

AutoMintPanel is a **pure UI** component — it has no useEffect triggers. It edits:
- **Global START/STOP** toggle (`autoMintGlobalEnabled`)
- **Default config** — template for new chains (FEE RANGE, MINTS, RBF, RESTART)
- **Session limit** — shared across all chains

The actual auto-mint logic lives in `useMultiChainAutoMint` hook which iterates all chains in `chainsMap` and evaluates conditions per-chain.

#### Per-Chain Config (`ChainConfig`)

| Parameter | Description |
|-----------|-------------|
| `mintCount` | TXs per chain (1-25) |
| `minRate` / `maxRate` | Fee rate range for entry (sat/vB) |
| `autoRbf` | Auto-bump when chain rate < mempool + buffer |
| `rbfBuffer` | RBF buffer percentage (default 10%) |
| `autoRestart` | Restart chain after confirmation |

Each chain has its own config, set at launch time (inherited from `defaultConfig`, editable).

#### Per-Chain Auto-State (`ChainAutoState`)

| Field | Description |
|-------|-------------|
| `enabled` | Auto-mint enabled for this chain |
| `triggered` | Mint action has been enqueued (prevents duplicates) |
| `rbfTriggered` | RBF action has been enqueued |
| `waitingForFreshFees` | Waiting for fresh fee data after confirmation |
| `feeAtConfirmation` | Fee rate when chain was confirmed |
| `waitStartTime` | When fresh-fee wait started (for 30s timeout) |
| `errorCount` | Consecutive errors — stops retrying at 3 |
| `status` | Human-readable status string |

#### How It Works

For each chain with `autoState.enabled` in `chainsMap`:

**Mint condition** (no active chain, `txids.length === 0`):
- `!triggered && !waitingForFreshFees`
- Fee in range: `currentFeeRate >= minRate && currentFeeRate <= maxRate`
- `errorCount < 3`
- Session budget OK
- No duplicate action in queue
- → Enqueue `{ type: 'mint', utxoKey, params: { mintCount, feeRate } }`

**RBF condition** (active chain, `config.autoRbf`):
- `!rbfTriggered && errorCount < 3`
- Fee in range
- `effectiveRate < currentFeeRate × (1 + rbfBuffer/100)`
- → Enqueue `{ type: 'rbf', utxoKey, params: { targetRate } }`

**Automatic Cycle:**
```
[Fee in range] → MINT → [Wait for confirmation] → [Confirmed] → [Fresh fees wait (30s max)] → [Fee in range?] → MINT → ...
```

#### Session Spending

- `sessionSpent` in DieselTerminal uses **actual costs** from handleMint/handleRbf/handleCpfp
- When RBF loses race (original confirms): overpay is subtracted via `preRbfTotalFees`
- Shared across all chains — `LIMIT` in AUTO-MINT panel
- `[RST]` resets session counter

#### Stale Fee Detection

After chain confirmation, waits for fresh mempool data before new mint (per-chain).
Two unlock conditions (whichever comes first):
1. Fee rate changes by > EPSILON (0.001 sat/vB)
2. 30 second timeout (FRESH_FEE_TIMEOUT_MS)

#### Error Handling

- `errorCount` increments on each consecutive error
- At `errorCount >= 3`: chain stops retrying, status shows `ERROR (stopped): ...`
- Success resets `errorCount` to 0
- `sourceUtxo` in ChainData prevents "Insufficient funds: 0 sats" when wallet cache times out

#### Statuses

| Status | Description |
|--------|-------------|
| `WAIT: 0.10 < 0.15 sat/vB` | Fee below minimum |
| `WAIT: 2.50 > 2.30 sat/vB` | Fee above maximum |
| `MINTING 20 @ 0.18 sat/vB...` | Minting in progress |
| `RBF: 0.14 → 0.17 sat/vB...` | Auto-RBF in progress |
| `RBF OK: 0.17 sat/vB` | RBF completed |
| `CONFIRMED — waiting for fresh fees` | Chain confirmed, waiting for fresh data |
| `LIMIT: need X sats, have Y` | Session limit reached |
| `LIMIT: RBF needs X sats` | RBF exceeds session budget |
| `ERROR (1/3): ...` | Error with retry remaining |
| `ERROR (stopped): ...` | Error, max retries reached |

#### Usage Example

1. Configure default settings in AUTO-MINT panel (fee range, mints, RBF, restart)
2. Click `[+ CHAIN]` → select UTXO → adjust config if needed → LAUNCH
3. Enable AUTO-MINT (global START)
4. Chain mints automatically when fee enters range
5. Auto-RBF keeps chain competitive if mempool rate rises
6. On confirmation with RESTART enabled → new chain starts on change output
7. Repeat with multiple chains on different UTXOs

### 6. Wallet Menu

Dropdown menu with wallet functions:

| Action | Description |
|--------|-------------|
| MANAGE | Show modal with address and backup seed |
| COPY ADDRESS | Copy address to clipboard |
| LOCK | Lock wallet (disconnect) |

### 7. Deposit Modal

Modal for balance replenishment and backup:

- **QR code** (if available)
- **Address** with copy button
- **SHOW SEED PHRASE** — show mnemonic (requires password)

#### Backup Seed Phrase

1. Click "SHOW SEED PHRASE"
2. Enter wallet password
3. After verification, 12/24-word mnemonic is displayed
4. "COPY" button for copying

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
| `lua_evalscript(script, ...args)` | Execute Lua script (server-side only) |

### Internal APIs (Next.js)

| API | Description |
|-----|-------------|
| `/api/competition` | Competition scan via `getblocktemplate` (Redis cached 15s) |
| `/api/pools?pool=DIESEL_FRBTC` | Price from DIESEL/frBTC pool |

### External APIs

| API | Description |
|-----|-------------|
| `mempool.space/api/v1/fees/mempool-blocks` | Mempool fee data |
| `mempool.space/api/v1/mining/difficulty-adjustments/1m` | Difficulty adjustment data |
| `mempool.space/api/address/{addr}/utxo` | UTXOs for address |
| `mempool.space/api/tx/{txid}/hex` | Raw transaction hex |

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

## Planned Improvements

See [DIESEL_TERMINAL_IMPROVEMENTS.md](./DIESEL_TERMINAL_IMPROVEMENTS.md) for the prioritized backlog of improvements (fetch timeouts, response validation, state persistence, etc.).

## Dependencies

- `bitcoinjs-lib` — transaction creation and signing
- `@bitcoinerlab/secp256k1` — ECC library for P2TR
- `@tanstack/react-query` — wallet data caching
- `mempool.space API` — fee and difficulty data
- `Subfrost RPC` — mempool scanning and broadcast
