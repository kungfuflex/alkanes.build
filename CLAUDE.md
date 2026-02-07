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
- `MAX_CHAIN_LENGTH = 20` — max TX in chain (leaving 5 slots for CPFP)

OP_RETURN for DIESEL mint:
```
6a5d1214011400ff7f818cec82d08bc0a88281d215
```

### RBF Race Condition — Chain Confirmation Check

**Problem**: When sending an RBF transaction, a block may be mined BEFORE the RBF reaches the mempool:
1. Original transactions get confirmed in the block
2. RBF txid never existed in mempool
3. System waits for confirmation of non-existent RBF txid

**Solution** (implemented in `DieselTerminal.tsx`):

```typescript
// 1. Check lastTxid (could be RBF replacement)
const lastTxData = await fetchTx(chainData.cpfpData.lastTxid);

// 2. If lastTxid confirmed → chain is done
if (lastTxData.result?.status?.confirmed) {
  removeChain();
  return;
}

// 3. If lastTxid not found (RBF didn't make it to mempool)
const lastTxNotFound = lastTxData.error || !lastTxData.result;

if (lastTxNotFound && chainData.mintResult.txids.length > 0) {
  // Check the FIRST TX of the original chain
  const firstTxData = await fetchTx(chainData.mintResult.txids[0]);

  // If first TX confirmed → original chain was mined (RBF lost the race)
  // If first TX also not found → chain was evicted from mempool
  if (firstTxData.result?.status?.confirmed || !firstTxData.result) {
    removeChain();
    return;
  }
}

// 4. If lastTxid not found — remove chain
if (lastTxNotFound) {
  removeChain();
}
```

**Key point**: We store `mintResult.txids[]` — array of original chain txids. When checking confirmation, first check `lastTxid`, and if not found — check the first TX of the original chain.

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

### Auto-Mint Improvements (2025)

#### Session Spending Limit
- Added `LIMIT` field in AUTO-MINT panel (sats)
- Tracks total spent during session (`SPENT X / Y`)
- Blocks new mints/RBF when limit reached
- `[RST]` button to reset session counter
- Fee calculation: `feePerTx = ceil(TX_VSIZE × feeRate)`, then `total = count × feePerTx`

#### Confirmed UTXO Filter
- Initial mint only uses confirmed UTXOs (`status.confirmed === true`)
- Prevents starting chains with unconfirmed outputs
- RBF/CPFP still uses unconfirmed (by design — extends existing chain)

#### Stale Fee Detection
- After chain confirmation, waits for fresh fee data before new mint
- Tracks `feeAtConfirmation` and compares with current rate
- Prevents minting at stale (previous block's) fee rate
- Status: `CONFIRMED — waiting for fresh fees...`

#### PENDING Chains Display
- COST column shows total sats spent (with thousands separator)
- Header tooltip: "Total fees paid in sats. Price per DIESEL = cost / emission"
