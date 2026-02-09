# Governance System

Documentation for the DIESEL governance voting system on ALKANES.

## Voting Power Snapshots

The governance system uses **snapshot-based voting** to prevent manipulation (buying tokens → voting → selling).

### How It Works

1. **Proposal Creation** — `snapshotBlock = currentBlock` is recorded
2. **Voting** — Query voter's DIESEL balance at `snapshotBlock`
3. **Verification** — Voting power = DIESEL balance at snapshot (not current)

### Historical Balance Queries

alkanes-rs supports querying balances at any historical block via `blockTag` parameter.

#### RPC Method

```bash
curl -X POST "https://mainnet.subfrost.io/v4/buildalkanes" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "alkanes_protorunesbyaddress",
    "params": [
      {"address": "bc1p...", "protocolTag": 1},
      "935039"  // block height for snapshot
    ],
    "id": 1
  }'
```

#### Response Format

```json
{
  "jsonrpc": "2.0",
  "result": {
    "balances": {"entries": []},
    "outpoints": [
      {
        "balance_sheet": {
          "cached": {
            "balances": [
              {
                "amount": 23710146,
                "block": 2,      // Alkane block (2 = DIESEL)
                "tx": 0          // Alkane tx (0)
              }
            ]
          }
        },
        "outpoint": {"txid": "...", "vout": 0},
        "output": {"value": 546}
      }
    ]
  },
  "id": 1
}
```

#### Extracting DIESEL Balance

DIESEL token ID is `2:0` (block=2, tx=0).

```typescript
const DIESEL_BLOCK = 2;
const DIESEL_TX = 0;

function getDieselBalance(response: any): bigint {
  let total = 0n;

  for (const outpoint of response.outpoints || []) {
    const balances = outpoint.balance_sheet?.cached?.balances || [];
    for (const balance of balances) {
      if (balance.block === DIESEL_BLOCK && balance.tx === DIESEL_TX) {
        total += BigInt(balance.amount);
      }
    }
  }

  return total;
}
```

### Example: Compare Historical vs Current Balance

```typescript
const address = 'bc1pa3s736wjyesxn8sxr3nrwetk3ccz8qta5h3flnlnlj9rmecerknqqy03ay';

// Balance at block 935039
const atSnapshot = await queryBalance(address, '935039');
// Result: 23,710,146 DIESEL (1 outpoint)

// Current balance
const current = await queryBalance(address, 'latest');
// Result: 491,829,437 DIESEL (3 outpoints)
```

### Implementation (current)

#### Proposal Creation (`/api/governance/proposals` POST)

1. `snapshot = await alkanesClient.getCurrentHeight()` — auto-set
2. Author's DIESEL balance checked against `proposalThreshold` from GovernanceSettings
3. Returns 403 if balance insufficient

#### Vote Submission (`/api/governance/vote` POST)

1. Server queries voter's DIESEL balance at proposal's snapshot block
2. Client-provided `votingPower` is **ignored** — server uses on-chain data
3. Returns 403 if balance = 0

```typescript
// Server-side (vote/route.ts)
const serverVotingPower = await alkanesClient.getDieselBalanceAtBlock(voter, proposal.snapshot);
if (serverVotingPower <= BigInt(0)) {
  return NextResponse.json({ error: "No DIESEL balance at snapshot block" }, { status: 403 });
}
```

#### Frontend (`app/[locale]/governance/[id]/page.tsx`)

- Uses `useWalletBalances` hook for balance display (client-side, via WASM)
- Do NOT use `alkanesClient` on client — it requires `Buffer` (Node.js only)
- `votingPower` is not sent in vote request — server determines it

## Signature Verification

The governance system verifies signatures to prove address ownership. This prevents someone from voting on behalf of another address.

### Signature Format

The system supports multiple signature formats with fallback:

1. **BIP-322** — Standard Bitcoin message signing (P2WPKH, P2TR)
2. **KeystoreSigner** — Simple SHA256 + ECDSA (used by ts-sdk keystore wallets)
3. **Browser wallets** — 65-byte recoverable ECDSA (Unisat, Xverse, etc.) + Bitcoin legacy message hash

### KeystoreSigner Format (Primary)

The ts-sdk `KeystoreSigner` uses a simple format:

```typescript
// Client-side signing (ts-sdk KeystoreSigner)
const messageBuffer = Buffer.from(message, 'utf8');
const hash = bitcoin.crypto.sha256(messageBuffer);
const signature = keyPair.sign(hash);  // ECDSA, 64 bytes compact
return signature.toString('base64');
```

### Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Client                                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Create message: JSON.stringify({proposalId, choice, timestamp}) │
│ 2. Sign with wallet: signature = await signMessage(message)     │
│ 3. Send: {voter, voterSig, voterPubkey, timestamp, ...}         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Server (/api/governance/vote)                                   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Reconstruct message with same format                         │
│ 2. Verify signature using publicKey                             │
│ 3. Return 401 if invalid, continue if valid                     │
└─────────────────────────────────────────────────────────────────┘
```

### Why PublicKey is Required

For **Taproot addresses** (bc1p...), the address contains the **output key** (tweaked), but KeystoreSigner signs with the **internal key** (untweaked). These are different keys:

```
outputKey = internalKey + H(internalKey) * G
```

We cannot derive `internalKey` from `outputKey`, so the client must send `publicKey` for verification.

### Implementation

#### Client Side

```typescript
// app/[locale]/governance/[id]/page.tsx
const { address, publicKey, signMessage } = useWallet();

const timestamp = Date.now();
const message = JSON.stringify({ proposalId, choice, timestamp });
const signature = await signMessage(message);

await fetch("/api/governance/vote", {
  method: "POST",
  body: JSON.stringify({
    proposalId,
    choice,
    voter: address,
    voterSig: signature,
    voterPubkey: publicKey,  // Required for verification
    timestamp,
  }),
});
```

#### Server Side

```typescript
// lib/bip322.ts
export async function verifyMessageSignature(
  message: string,
  address: string,
  signature: string,
  networkType: 'mainnet' | 'testnet' | 'regtest',
  publicKey?: string  // Hex-encoded, 33 bytes compressed
): Promise<boolean> {
  // 1. Try BIP-322 first
  if (verifyBip322Signature(message, address, signature, networkType)) {
    return true;
  }

  // 2. Fallback: KeystoreSigner format (SHA256 + ECDSA)
  if (publicKey) {
    const pubkeyBuffer = Buffer.from(publicKey, 'hex');
    const messageHash = sha256(Buffer.from(message, 'utf8'));
    if (ecc.verify(messageHash, pubkeyBuffer, sigBuffer)) {
      return true;
    }
  }

  return false;
}
```

### WalletContext Fix

The `publicKey` in WalletContext must match the address type:

```typescript
// context/WalletContext.tsx
const publicKey = useMemo(() => {
  if (walletType === 'browser') {
    return browserAddress.publicKey;
  }
  // Use taproot pubkey since primaryAddress is taproot
  return addresses.taproot.pubkey || addresses.nativeSegwit.pubkey;
}, [walletType, browserAddress, addresses]);
```

### Message Format

Messages must match exactly between client and server:

**Vote:**
```json
{"proposalId":"cmla...","choice":0,"timestamp":1770339190214}
```

**Proposal:**
```json
{"title":"...","body":"...","choices":["For","Against"],"timestamp":1770339190214}
```

## Security Considerations

### What Snapshots Prevent

1. **Vote buying** — Can't buy DIESEL, vote, then sell
2. **Flash loan attacks** — Balance must exist at past block
3. **Double voting via transfer** — Same tokens can't vote twice

### What Signatures Prevent

1. **Impersonation** — Can't vote as another address without private key
2. **Replay attacks** — Timestamp in message prevents reuse
3. **Message tampering** — Signature covers exact message content

### Implementation Status

- [x] BIP-322 signature verification (prove address ownership)
- [x] KeystoreSigner signature verification (SHA256 + ECDSA)
- [x] Voting power verification in `/api/governance/vote`
- [x] Proposal creation threshold check (10 DIESEL minimum)
- [x] Auto-snapshot at proposal creation
- [ ] Quorum verification when closing proposals
- [x] Browser wallet signature verification (Xverse, Unisat, etc.)

## Database Schema

```prisma
model Proposal {
  id        String   @id @default(cuid())
  snapshot  Int      // Block height for voting power snapshot (auto-set)
  author    String   // Bitcoin address
  authorSig String   // Signature for verification
  // ...
}

model Vote {
  id          String   @id @default(cuid())
  voter       String   // Bitcoin address
  voterSig    String   // Signature for verification
  votingPower BigInt   // Server-verified DIESEL balance at snapshot
  // ...
}

model GovernanceSettings {
  proposalThreshold BigInt @default(10000000) // 10 DIESEL (6 decimals)
  // ...
}
```

Note: VotingPowerSnapshot/AddressBalance models exist in schema but are not used — balances are queried on-demand via RPC.

## Constants

```typescript
// DIESEL token coordinates
const DIESEL_ALKANE = { block: 2, tx: 0 };
const DIESEL_ID = '2:0';
const DIESEL_DECIMALS = 6;

// Governance thresholds
const PROPOSAL_THRESHOLD = BigInt('10000000'); // 10 DIESEL

// RPC endpoint
const RPC_URL = process.env.NEXT_PUBLIC_ALKANES_RPC_URL
  || 'https://mainnet.subfrost.io/v4/buildalkanes';

// Protocol tag for alkanes
const ALKANES_PROTOCOL_TAG = 1;
```

## API Endpoints

### POST /api/governance/proposals

Create a new proposal.

**Request:**
```json
{
  "title": "Proposal Title",
  "body": "Description in markdown",
  "choices": ["For", "Against"],
  "author": "bc1p...",
  "authorSig": "base64...",
  "authorPubkey": "hex...",
  "timestamp": 1770339190214
}
```

**Validation:**
1. Signature verification (401 if invalid)
2. DIESEL balance >= 10 (403 if insufficient)

### POST /api/governance/vote

Cast a vote on a proposal.

**Request:**
```json
{
  "proposalId": "cmla...",
  "choice": 0,
  "voter": "bc1p...",
  "voterSig": "base64...",
  "voterPubkey": "hex...",
  "timestamp": 1770339190214
}
```

**Validation:**
1. Signature verification (401 if invalid)
2. DIESEL balance at snapshot > 0 (403 if none)
3. Not already voted (400 if duplicate)
