# DIESEL Terminal — Planned Improvements

Prioritized backlog of improvements for `DieselTerminal.tsx` and `AutoMintPanel.tsx`.

Status legend: `[ ]` todo, `[x]` done, `[-]` won't do

## High Priority

### 1. Fetch Timeouts via AbortController
`[x]` Add `AbortController` with 30-second timeout to all fetch calls.

**Problem**: `detectExistingChain()`, `checkAllChains()`, `executeMint()`, and other fetch-heavy functions have no timeouts. If mempool.space or the RPC endpoint is slow, requests hang indefinitely — blocking UI and leaking resources.

**Affected locations**:
- `executeMint()` — UTXO fetch, raw TX fetch, broadcast
- `detectExistingChain()` — multiple sequential raw TX fetches
- `checkConfirmation()` / `checkAllChains()` — esplora_tx polling
- `fetchBlockHeight()` — block header fetch
- `fetchDifficultyData()` — mempool.space difficulty API
- `scanForDieselMints()` — competition scan (moved to server API, but client fetch still needs timeout)

**Fix**: Create a helper `fetchWithTimeout(url, options, timeoutMs = 30000)` that wraps `fetch` with `AbortController`. Use it everywhere.

### 2. Missing HTTP Response Status Checks
`[x]` Check `response.ok` before calling `.json()` / `.text()` on fetch responses.

**Problem**: Multiple fetch calls parse the response body without checking the HTTP status. A 404/500 response may return HTML or an error body, causing `.json()` to throw an unhelpful `SyntaxError: Unexpected token` instead of a meaningful error.

**Affected locations**:
- `executeMint()` — `fetch(mempool.space/api/address/.../utxo)`, `fetch(mempool.space/api/tx/.../hex)`
- `detectExistingChain()` — raw TX hex fetches, esplora_tx calls
- `fetchBlockHeight()` — `getblockheader` and `getbestblockhash` RPCs
- `fetchDifficultyData()` — mempool.space difficulty endpoint
- `broadcastTransaction()` — broadcast endpoint

**Fix**: After every `fetch()`, check `if (!response.ok) throw new Error(...)` before parsing.

### 3. Persist `chainsMap` in sessionStorage
`[ ]` Save chain state to sessionStorage so page refresh doesn't lose tracking data.

**Problem**: On page refresh, all chain tracking state (`chainsMap`, `mintResult`, `cpfpData`, `rbfData`) is lost. The `detectExistingChain()` function must re-scan the mempool (5-15 seconds) to rebuild state.

**Fix**: Serialize `chainsMap` to sessionStorage on every update. On mount, hydrate from sessionStorage before running detection. Detection still runs as a background validation.

### 4. Loading Indicator During Chain Detection
`[ ]` Show "DETECTING CHAINS..." status while `detectExistingChain()` is running.

**Problem**: Chain detection fetches multiple raw TXs sequentially with no progress indicator. With 5+ chains this can take 5-15 seconds, and the UI appears frozen.

**Fix**: Set a loading state before detection starts, clear it when done. Optionally show chains incrementally as they're found.

## Medium Priority

### 5. Shared `TX_VSIZE` Constant
`[ ]` Extract `TX_VSIZE = 141` to a shared module.

**Problem**: The constant is duplicated in `DieselTerminal.tsx` (line 14) and `AutoMintPanel.tsx` (line 30).

### 6. Memoize PENDING CHAINS Calculations
`[ ]` Wrap emission/ROI calculations in `useMemo`.

**Problem**: For each chain in the PENDING CHAINS table, emission, cost, ROI, and profit are recalculated inline on every render. With multiple chains this adds unnecessary work.

### 7. Retry Button for Failed API Calls
`[ ]` Add manual retry buttons when mempool.space or RPC endpoints fail.

**Problem**: When APIs are down, the terminal has no way to retry without a full page refresh. Error states are shown but not actionable.

## Low Priority

### 8. Bulk RBF ("RBF ALL")
`[ ]` Add a button to RBF all chains to a target rate in one action.

### 9. Pass `feeCap` to AutoMintPanel
`[ ]` So the auto-mint panel knows about the fee cap and can display it in status.

### 10. DieselTerminal Unit Tests
`[ ]` The main component (2500 LOC) has zero tests. Key testable units:
- `executeMint()` (extract as pure function)
- `detectExistingChain()` chain parsing logic
- Fee calculation / RBF math
- Confirmation check logic (already has cross-check fix, needs regression tests)

Note: Full component tests are hard due to heavy external dependencies (wallet signing, RPC, mempool.space). Focus on extracting and testing pure logic functions.
