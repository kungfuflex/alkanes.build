# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**alkanes.build** — documentation, governance and forum platform for the ALKANES protocol on Bitcoin. Next.js 16 application with Prisma ORM, Redis caching and @alkanes/ts-sdk integration.

## Commands

### Development
```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (webpack)
pnpm dev:turbo            # Start dev server (turbopack, faster)
pnpm dev:full             # Setup local DB + start dev server
```

### Database (Prisma + PostgreSQL)
```bash
pnpm docker:up            # Start PostgreSQL & Redis containers
pnpm docker:down          # Stop containers
pnpm db:push              # Push schema to DB
pnpm db:migrate           # Create migration
pnpm db:seed              # Seed initial data
pnpm db:reset             # Reset DB + seed
pnpm db:studio            # Open Prisma Studio GUI
```

### Testing (Vitest)
```bash
pnpm test                 # Run all tests
pnpm test:watch           # Watch mode
pnpm test:coverage        # With coverage
pnpm test:ui              # Vitest UI
pnpm test:live            # Integration tests with real RPC
```

### Build & Deploy
```bash
pnpm build                # Build for production
pnpm build:docs           # Build MDX docs only
pnpm start                # Start production server
pnpm gcp:deploy           # Deploy to Google Cloud Run
```

## Architecture

### Directory Structure
```
app/
├── [locale]/             # i18n routes (en, ru, etc.)
│   ├── docs/             # MDX documentation pages
│   ├── governance/       # Proposals, voting
│   ├── forum/            # Discussion threads
│   ├── vaults/           # DeFi vault interfaces
│   ├── wallet/           # Wallet management
│   └── profile/          # User profiles
├── api/                  # Next.js API routes
│   ├── governance/       # Proposals, voting endpoints
│   ├── forum/            # Discussions, posts, reactions
│   ├── pools/            # AMM pool data, candles
│   ├── wallet/           # Balance queries
│   └── pkg/              # SDK package serving
components/               # React components
lib/
├── alkanes-client.ts     # ALKANES RPC client wrapper
├── prisma.ts             # Prisma client singleton
├── redis.ts              # Redis client
└── utils.ts              # Shared utilities
hooks/                    # React hooks
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Seed data
```

### Key Technologies
- **Next.js 16** with App Router, React 19
- **Prisma** ORM with PostgreSQL
- **Redis** for caching (pool data, SDK versions)
- **@alkanes/ts-sdk** for blockchain interaction
- **next-intl** for internationalization (en, ru)
- **Radix UI** for components
- **BIP-322** signatures for Bitcoin address authentication

## WASM SDK Integration

### Local WASM Copy Pattern

The project uses a local copy of WASM files in `lib/oyl/alkanes/` instead of importing from node_modules. This avoids webpack bundling issues with WASM.

Key files:
- `lib/oyl/alkanes/alkanes_web_sys.js` - WASM wrapper
- `lib/oyl/alkanes/alkanes_web_sys_bg.wasm` - Compiled WASM binary
- `lib/oyl/alkanes/alkanes_web_sys.d.ts` - TypeScript types

### Webpack Configuration (next.config.ts)

```typescript
const localWasmPath = "./lib/oyl/alkanes/alkanes_web_sys.js";

// Webpack alias for WASM module
config.resolve.alias = {
  "@alkanes/ts-sdk/wasm": path.join(__dirname, localWasmPath),
};

// Required experiments for WASM
config.experiments = { asyncWebAssembly: true, layers: true };

// Output WASM to static folder
config.output.webassemblyModuleFilename = (isServer ? '../' : '') + 'static/wasm/[modulehash].wasm';

// Handle dynamic imports in SDK
config.plugins.push(
  new webpack.NormalModuleReplacementPlugin(/@alkanes\/ts-sdk\/wasm$/, path.join(__dirname, localWasmPath))
);
```

### Network Detection

Network is detected in `app/[locale]/providers.tsx`:
- Production domains (`alkanes.build`, `subfrost.io`) → `mainnet`
- `regtest.` subdomain → `regtest`
- `localhost` → uses `NEXT_PUBLIC_NETWORK` env variable (defaults to `mainnet`)

## Wallet Balances

### Balance Fetching Strategy

The `useWalletBalances` hook fetches balances from multiple sources in parallel:

1. **BTC Balance**: via `getEnrichedBalances()` from WebProvider (uses `balances.lua` script)
2. **Alkanes Balance**: via direct `alkanes_protorunesbyaddress` RPC call
   - `balances.lua` doesn't reliably return alkanes due to txid format issues
   - Separate RPC call aggregates balances from all outpoints
3. **Runes Balance**: via Hiro API (`https://api.hiro.so/runes/v1/addresses/`)

### WASM Response Handling

WASM module (via serde_wasm_bindgen) may return `Map` objects instead of plain objects:

```typescript
function mapToObject(value: any): any {
  if (value instanceof Map) {
    const obj: Record<string, any> = {};
    for (const [k, v] of value.entries()) {
      obj[k] = mapToObject(v);
    }
    return obj;
  }
  if (Array.isArray(value)) {
    return value.map(mapToObject);
  }
  return value;
}

// Extract enriched data handling both Map and plain object
function extractEnrichedData(rawResult: any) {
  let enrichedData = rawResult instanceof Map
    ? mapToObject(rawResult.get('returns'))
    : rawResult?.returns || rawResult;
  // ...
}
```

## Known Issues & Solutions

### P2TR (Taproot) Signing - Key Tweaking Required

For P2TR key-path spending, the private key must be **tweaked** before signing (BIP-341 requirement):

```typescript
// X-only pubkey (remove 1-byte prefix from 33-byte compressed pubkey)
const xOnlyPubkey = taprootChild.publicKey.slice(1, 33);

// Tweak the key for taproot key-path spend
const tweakedChild = taprootChild.tweak(
  bitcoin.crypto.taggedHash('TapTweak', xOnlyPubkey)
);

// Sign with tweaked key
psbt.signInput(i, tweakedChild);
```

### Dust Limits
- **P2TR (Taproot)**: 330 sats
- **P2WPKH (Native SegWit)**: 546 sats

### DIESEL Minting

Constants:
- `TX_VSIZE = 141` — fixed size for DIESEL mint transaction
- `MAX_CHAIN_LENGTH = 25` — max unconfirmed TX chain (Bitcoin mempool limit)

OP_RETURN for DIESEL mint:
```
6a5d1214011400ff7f818cec82d08bc0a88281d215
```

### Competition Scanner

Uses `btc_getblocktemplate` RPC to count DIESEL mints in the projected next block. Single RPC call returns all TXs with raw hex — search for DIESEL prefix `6a5d1214011400` via `string.includes`. No Lua scripts, no `getrawtransaction`. Cached 15s in Redis.

- `app/api/competition/route.ts` — API endpoint (direct RPC to `btc_getblocktemplate`)
- `GET /api/competition` → `{ next_block_txs, diesel_mints }`

### RBF Eviction — Chain Recovery via Chain-Walking

**Problem**: When RBF TX is evicted from mempool (block mined, mempool policy, etc.), the system must find the last valid TX in the original chain and either restart or restore.

**Solution** (implemented in `checkAllChains` in `DieselTerminal.tsx`):

For each chain in `chainsMap`:
1. Check `cpfpData.lastTxid` (could be RBF replacement) via `esplora_tx`
2. If confirmed → normal completion (auto-restart on change output if enabled)
3. If **not found** (evicted) → **walk the entire chain backwards** to find last valid TX:
   - Build original txid list: `[TX1, TX2, ..., TXn]` (restore `preRbfLastTxid` if RBF was done)
   - Walk from last to first, calling `esplora_tx` for each
   - Stop at first TX that exists (confirmed or in mempool)
4. Based on what's found:
   - **All TXs gone** → delete chain
   - **Last valid TX confirmed** → restart on its change output (adjust SPENT for RBF overpay)
   - **Last valid TX in mempool** → **RESTORE chain** (trim txids, reset RBF state, continue)
5. Separate cross-check: if RBF TX is found but `preRbfLastTxid` exists → check if original confirmed (RBF-lost-race while RBF still floating)

**Chain restore** (`restoredChains`):
- `mintResult.txids` trimmed to valid TXs only
- `cpfpData` updated to last valid TX
- `rbfData` recalculated, `preRbfTotalFees`/`preRbfLastTxid` reset to null
- `autoState.rbfTriggered`/`triggered` reset, status = "RECOVERED — N TXs valid"
- Chain continues auto-minting/RBF from restored state

**Key fields in `RbfData`**:
- `preRbfTotalFees: number | null` — total chain fees before first RBF (for SPENT correction)
- `preRbfLastTxid: string | null` — last txid before first RBF (for correct restart UTXO + chain restore)

**Important**: After RBF, `mintResult.txids = [TX1, TX2, ..., TX_RBF]` — the last element is the RBF txid, NOT the original. The original is preserved in `rbfData.preRbfLastTxid`.

**Same logic in `checkChainAndRestart`**: Called on broadcast failure ("missingorspent"). Walks chain backwards, confirmed → restart, mempool → return false (wait), all gone → delete.

## Governance — Voting Power Verification

Server-side verification of DIESEL balances for governance. See `docs/GOVERNANCE.md` for full details (RPC format, response parsing, security considerations).

### Key Files
- `lib/alkanes-client.ts` — `getDieselBalanceAtBlock(address, blockHeight)` method
- `app/api/governance/proposals/route.ts` — auto-snapshot + proposalThreshold check
- `app/api/governance/vote/route.ts` — server-side voting power verification
- `app/[locale]/governance/[id]/page.tsx` — proposal detail / voting UI
- `docs/GOVERNANCE.md` — full governance system documentation

### How It Works
1. **Proposal creation**: `snapshot = currentBlock` auto-set via `alkanesClient.getCurrentHeight()`
2. **Author check**: DIESEL balance >= `proposalThreshold` (from GovernanceSettings, default 10 DIESEL)
3. **Voting**: server queries `alkanes_protorunesbyaddress` at snapshot block, ignores client-provided votingPower
4. **Rejection**: 403 if balance = 0 at snapshot or below threshold

### RPC Call Format (Historical Balance)
```
alkanes_protorunesbyaddress params: [{ address, protocolTag: 1 }, "blockHeight"]
```
Block height is the **second element** of params array (string), NOT inside the first object.

### Important Notes
- `alkanesClient` (server-side) uses `Buffer` — do NOT import on client. Use `useWalletBalances` hook instead
- DIESEL token ID: block=2, tx=0 (`DIESEL_TOKEN.alkaneId`)
- BigInt responses must be serialized via `serializeBigInt()` before `NextResponse.json()`
- BIP-322 signature verification is still TODO

## Environment Variables

```bash
DATABASE_URL              # PostgreSQL connection string
REDIS_URL                 # Redis connection string
NEXT_PUBLIC_NETWORK       # mainnet | testnet | signet | regtest
NEXT_PUBLIC_ALKANES_RPC_URL  # Alkanes RPC endpoint (default: https://mainnet.subfrost.io/v4/buildalkanes)
```

## Docker Services (docker-compose.yaml)

- **postgres**: Port 5433 (avoids conflict with standard 5432)
- **redis**: Port 6380 (avoids conflict with standard 6379)

## Code Cleanup History

### Manual Controls Removed (2025)
- Removed `showManualControls` constant and all related JSX (was always `false`)
- Removed manual parameter inputs (block reward, diesel price, tx cost, competition)
- Removed strategy matrix table
- Removed `manualMints` state and related calculations
- Simplified `results` computation to only `isProfitable` boolean
- Removed unused formatters (`fmt`, `fmtInt`, `fmtPct`)
- Terminal now shows only: STATUS bar, AUTO-MINT panel, PENDING chains list

### Multi-Chain DIESEL Minting Architecture

The terminal supports **parallel multi-chain minting** — multiple independent TX chains running simultaneously, each with its own config.

#### Key Files
- `components/diesel-terminal/types.ts` — `ChainData`, `ChainConfig`, `ChainAutoState`, `RbfData`, `CpfpData`, `ActionQueueItem`
- `components/diesel-terminal/constants.ts` — `TX_VSIZE`, `MAX_CHAIN_LENGTH`, `DEFAULT_CHAIN_CONFIG`, factory functions
- `components/diesel-terminal/useMultiChainAutoMint.ts` — per-chain state machine: evaluates mint/RBF conditions, enqueues actions
- `components/diesel-terminal/useActionQueue.ts` — FIFO queue for sequential wallet signing (one PSBT at a time)
- `components/diesel-terminal/UtxoSelectorModal.tsx` — UTXO picker + per-chain config for launching new chains
- `components/diesel-terminal/ChainConfigEditor.tsx` — inline config editor (reused in modal and expandable row)

#### Architecture
- `chainsMap: Map<string, ChainData>` — single source of truth, keyed by `txid:vout` of source UTXO
- `useMultiChainAutoMint` — iterates all chains, evaluates mint/RBF conditions per-chain, enqueues to action queue
- `useActionQueue` — FIFO queue, processes one action at a time (wallet signs one PSBT at a time)
- `handleMintForChain(utxoKey, ...)` / `handleRbfForChain(utxoKey, ...)` / `handleCpfpForChain(utxoKey, ...)` — parametrized by chain key
- `AutoMintPanel` — pure UI: global START/STOP toggle, default config editor (template for new chains), session limit

#### Per-Chain Config (`ChainConfig`)
- `mintCount` (1-25), `minRate`/`maxRate` (fee range), `autoRbf`, `rbfBuffer` (%), `autoRestart`

#### Per-Chain Auto-State (`ChainAutoState`)
- `enabled`, `triggered`, `rbfTriggered` — prevent duplicate actions
- `waitingForFreshFees` / `feeAtConfirmation` / `waitStartTime` — stale fee detection (30s timeout)
- `errorCount` — consecutive errors, stops retrying at 3
- `status` — human-readable status string

#### Session Spending
- `sessionSpent` in DieselTerminal uses **actual costs** from handleMint/handleRbf/handleCpfp (not estimates)
- `preRbfTotalFees` in RbfData — when original chain confirms (RBF invalid), subtracts overpay
- `LIMIT` field in AUTO-MINT panel, shared across all chains
- `[RST]` button to reset session counter

#### Source UTXO Binding
- `sourceUtxo?: UtxoInput` in `ChainData` — stores UTXO value at chain creation time
- Prevents "Insufficient funds: 0 sats" when wallet cache times out
- `handleMintForChain` checks: `sourceUtxo` first → `availableUtxos` → throw + refetchBalances

#### Auto-Restart
- On chain confirmation with `config.autoRestart && autoMintGlobalEnabled`:
  - Normal: new chain on `lastTxid:0` with `sourceUtxo` from `cpfpData.lastOutputValue`
  - RBF-lost-race: new chain on `preRbfLastTxid:0`, no `sourceUtxo` (fetched from wallet)
  - Both cases: `waitingForFreshFees: true` with 30s timeout

#### Confirmed UTXO Filter
- Initial mint only uses confirmed UTXOs (`status.confirmed === true`)
- RBF/CPFP still uses unconfirmed (by design — extends existing chain)

#### PENDING Chains Display
- COST column shows total sats spent (with thousands separator)
- Per-chain status row, expandable config editor, pause/resume/delete actions
