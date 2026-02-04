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

## TODO / Future Changes

### Remove Terminal Mode (when user requests)
- Delete `/app/[locale]/terminal/page.tsx`
- Delete `/components/DieselTerminal.tsx`
- Keep only Autopilot mode at `/app/[locale]/autopilot/page.tsx`
- The full Terminal with charts, orderbook, manual mint buttons etc. will be removed
- Only the simplified Autopilot with AutoMintPanel will remain
