"use client";

import { useLocale } from "next-intl";

/**
 * BTC/USD CLI reference.
 *
 * Editorial rule for this page: an invariant is written as an invariant, and a
 * number that moves is written as a dated measurement plus the command that
 * re-measures it. Everything under "Measured state" was read off mainnet at the
 * height stamped there; everything else is a property of the deployment.
 *
 * English only, on purpose. This is a money path, and an unreviewed translation
 * of a warning is worse than no translation. `/docs/cli/espo` sets the same
 * precedent.
 */

const content = {
  en: {
    title: "BTC/USD Commands",
    intro:
      "The btcusd namespace trades BTC against USD on SUBFROST: the frUSD/frBTC CryptoSwap pool on alkanes, plus the two EVM bridge arms (USDC/USDT in, USDC/ETH out). Use it to read market data, quote a swap, prepare a bridge deposit or a burn, and watch mempool and rollup activity on both chains.",

    mainnetWarnTitle: "There is no testnet for this",
    mainnetWarn:
      "This pool and this vault exist on mainnet only. Every failure mode flagged below is one where the system succeeds while doing the wrong thing: no error is raised on either chain, and the money is gone. Read the warnings as operational instructions, not as style.",

    readRuleTitle: "The read rule",
    readRule:
      "Read chain state with metashrew_view, never with an alkanes_* JSON-RPC method. The alkanes_* wrappers are a different code path from the one production reads, and they diverge. The CLI already speaks the correct surface everywhere. Also: use the /v4 endpoints for Bitcoin data, not mempool.space.",

    endpointsTitle: "Endpoints",
    endpointsIntro:
      "Every btcusd subcommand routes to one of these. {apikey} is your SUBFROST key, passed as --subfrost-api-key or SUBFROST_API_KEY.",
    endpoints: [
      {
        path: "/v4/{apikey}",
        serves: "Main JSON-RPC: metashrew_view, metashrew_height, esplora_*, btc_*",
      },
      {
        path: "/v4/{apikey}/btcusd",
        serves: "Dedicated BTCUSD index, protobuf in both directions (package alspo.cryptoswap)",
      },
      {
        path: "/v4/{apikey}/espo",
        serves: "Espo-shaped <module>.<suffix> routes, for example ammdata.get_btc_usd_price",
      },
      {
        path: "/v4/{apikey}/mempool",
        serves: "Mempool JSON-RPC and websocket change stream",
      },
      {
        path: "/v4/{apikey}/ethereum-builder",
        serves: "Private submission for the Ethereum leg, keeping the deposit out of the public mempool",
      },
    ],
    keyWarnTitle: "With no key you fall back, loudly",
    keyWarn:
      "Without a key the CLI uses the shared /v4/jsonrpc endpoint and prints a warning on every call. That endpoint is rate limited and shared with everyone. The CLI throttles to the cap rather than failing, because a half-executed trade sequence is the worst available outcome, but an unattended agent that never surfaces the fallback looks like it is running normally right up until it is throttled mid-trade. Get a key at api.subfrost.io.",

    surfaceTitle: "Command surface",
    surfaceIntro:
      "What each subcommand does today. \"Reads\" and \"prepares\" are usable now; \"not wired\" refuses on purpose rather than emitting a transaction that looks right and is not.",
    surface: [
      { cmd: "price", status: "reads", desc: "Executed, marginal and oracle USD/BTC from the dedicated index" },
      { cmd: "pool", status: "reads", desc: "Reserves, LP supply, virtual price, marginal price, bridge conversion cap" },
      { cmd: "candles", status: "raw", desc: "OHLC candles. Buckets 3600 and 86400 only. Prints the protobuf answer as hex today" },
      { cmd: "quote", status: "reads", desc: "Expected output, effective execution price, and the size as bps of the incoming leg" },
      { cmd: "signers", status: "raw", desc: "The frBTC/frUSD signing group. Prints the protobuf answer as hex today" },
      { cmd: "watch", status: "reads", desc: "Poll mempool and confirmed activity for the pool, the signers, or your own addresses" },
      { cmd: "mempool", status: "reads", desc: "info, template, entry, watch. Backed by /v4/{apikey}/mempool" },
      { cmd: "simulate", status: "reads", desc: "Dry-run against current state, optionally including the pending set" },
      { cmd: "simulate-block", status: "reads", desc: "Simulate a whole block: where fees land, and what ordering does to your quote" },
      { cmd: "deposit", status: "prepares", desc: "Prints the approve + depositAndBridge calls for USDC/USDT in. Local signing is not built" },
      { cmd: "burn", status: "prepares", desc: "Builds the burnData payload for frUSD out to USDC/ETH. Broadcast is not built" },
      { cmd: "swap", status: "not wired", desc: "Needs Bitcoin transaction construction (UTXO selection, protostone assembly, signing)" },
      { cmd: "add-liquidity", status: "not wired", desc: "Same missing machinery as swap" },
      { cmd: "remove-liquidity", status: "not wired", desc: "Same missing machinery as swap" },
    ],
    statusLegend: {
      reads: "works, read only",
      raw: "works, output not decoded yet",
      prepares: "builds the payload, you sign",
      "not wired": "refuses, by design",
    },

    poolTitle: "The pool",
    poolIntro:
      "These are properties of the deployment. They do not move between blocks, so they are safe to hardcode.",
    poolFacts: [
      { k: "Address callers use", v: "4:1778, an Upgradeable PROXY, and also the frBTCUSD LP token" },
      { k: "Implementation", v: "4:1786, the CryptoSwap (Curve V2) math" },
      { k: "token0", v: "frUSD 4:1776 (itself a proxy), 8 decimals" },
      { k: "token1", v: "frBTC 32:0, 8 decimals" },
      { k: "LP token", v: "4:1778, 18 decimals" },
      { k: "Curve", v: "A = 400000, gamma = 1.45e14, precision 1e10 on both legs" },
      { k: "Fees", v: "0.2% mid, 0.8% out, depending on how unbalanced the trade leaves the pool" },
    ],

    opcodesTitle: "Opcodes",
    opcodesIntro:
      "The implementation's opcodes. The proxy keeps its own in a high range so they cannot collide: initialize = 32767, initialize_with_auth = 32764, upgrade = 32766, forward = 36863. Everything else falls through to the implementation by delegatecall.",
    opcodes: [
      { op: "0", name: "init_pool" },
      { op: "1", name: "add_liquidity" },
      { op: "2", name: "remove_liquidity" },
      { op: "3", name: "remove_liquidity_one_coin" },
      { op: "5", name: "exchange" },
      { op: "100", name: "get_virtual_price" },
      { op: "101", name: "get_balances" },
      { op: "102", name: "get_A" },
      { op: "103", name: "get_gamma" },
      { op: "104", name: "price_oracle" },
      { op: "105", name: "price_scale" },
      { op: "106", name: "lp_price" },
      { op: "107", name: "get_dy" },
      { op: "108", name: "calc_token_amount" },
    ],

    trapsTitle: "Three ways to read this pool wrong",
    traps: [
      {
        title: "Opcode 102 is get_A, not get_decimals",
        body:
          "4:1778 does not implement the token ABI. Opcode 99 (get_name) reverts, opcode 100 returns virtual_price as a 1e18 number rather than a symbol, and opcode 102 returns 400000, the amplification coefficient A. Anything that treats 102 as get_decimals renders every LP balance at 1e400000. Identify a CryptoSwap pool by lp_price (106) answering, which reverts on ordinary tokens.",
      },
      {
        title: "LP is 18 decimals, and the supply is past u64",
        body:
          "18 is a property of the math, not a declaration: LP is minted in units of the invariant D, which lives in 1e18-normalised space. Amounts come back as decimal STRINGS and must stay strings. A u64 or double parse silently corrupts them. This is not hypothetical: a u64 parse is what froze 23.0137 LP as unspendable.",
      },
      {
        title: "Prices are token1 per token0, so USD/BTC is the reciprocal",
        body:
          "The index quotes frBTC per frUSD. USD/BTC is price_q_scale / price_q. Getting it backwards yields a number near zero, which reads as \"no price\" rather than as an error. The CLI's price and pool subcommands already decode this for you.",
      },
      {
        title: "indexheight is a tautology, not a liveness signal",
        body:
          "/index_height is rewritten every block with that block's height, so a view read at height H always returns H, including for a block that does not exist. Use metashrew_height to tell fresh from stalled. Note also that the height stamped on a pool read is the last block that CHANGED the pool, so it legitimately trails the chain tip when nobody has traded.",
      },
    ],

    measuredTitle: "Measured state",
    measuredStamp:
      "Read off mainnet on 2026-08-15. Pool state height 962,472; chain tip at the time of reading 962,510. Everything in this section moves. Re-run the commands rather than trusting the numbers.",
    measuredRows: [
      { k: "frUSD reserve", v: "1881214389078 base units (18,812.14389078)" },
      { k: "frBTC reserve", v: "29521902 base units (0.29521902)" },
      { k: "LP supply", v: "74516779814608897626 (74.516779814608897626, 18 decimals)" },
      { k: "Virtual price", v: "1.000089524433596945" },
      { k: "Marginal price", v: "64,083.94 USD/BTC" },
      { k: "Bridge conversion cap", v: "188121438907 base units (1,881.21 frUSD), 1000bps of the frUSD reserve" },
      { k: "Market reference", v: "63,572.03 USD/BTC, so the pool's marginal price sat about 0.8% above market" },
    ],
    marketCmdNote:
      "The market reference comes from the espo index, which answers a scaled decimal string. At the reading above it answered \"635720265865300000000\", which is 63,572.03 USD/BTC:",

    ladderTitle: "What size actually costs",
    ladderIntro:
      "The marginal price is not the price you get. This pool is shallow, so the gap is material and it is asymmetric: buying BTC out of the pool is expensive, selling BTC into it currently clears near or above market. Quote before you trade, at the size you intend to trade.",
    ladderBuyTitle: "Buying frBTC with frUSD",
    ladderBuyCols: ["Size in", "bps of incoming leg", "frBTC out (base)", "Effective USD/BTC"],
    ladderBuy: [
      ["$100", "53", "155712", "64,221"],
      ["$500", "265", "769370", "64,988"],
      ["$1,000", "531", "1500719", "66,635"],
      ["$1,881", "999", "2698741", "69,707"],
      ["$5,000", "2657", "6211872", "80,491"],
    ],
    ladderSellTitle: "Selling frBTC for frUSD",
    ladderSellCols: ["Size in", "bps of incoming leg", "frUSD out (base)", "Effective USD/BTC"],
    ladderSell: [
      ["0.001 BTC", "33", "6385565367", "63,856"],
      ["0.03 BTC", "1016", "174596643829", "58,199"],
    ],

    capTitle: "The 1000bps cap is a bridge rule, not a swap rule",
    capBody:
      "MAX_POOL_SHARE_BPS = 1000 governs BRIDGE conversions: when a deposit asks to convert more than 10% of the frUSD reserve into BTC, the coordinator refuses the swap and pays out plain frUSD instead. The deposit still succeeds and neither chain raises an error, so a caller who does not check gets a stablecoin where they asked for BTC. A DIRECT swap on the pool has no such cap: it executes at whatever the curve gives. That is why quote reports your size as bps of the incoming leg and calls it price impact rather than a limit. Set your own min_dy.",

    readsTitle: "Reading market data",
    quoteTitle: "quote, before anything else",
    quoteNote:
      "Amounts are in the source token's BASE units, as decimal strings. Both frUSD and frBTC are 8 decimals here, so $100 is 10000000000 and 0.001 BTC is 100000.",
    poolCmdNote:
      "pool also reports whether the curve is ramping and whether the pool is killed. Check both before quoting: a ramping curve moves between blocks, so a quote taken now may not hold, and is_killed means refuse to trade at all.",

    armATitle: "Arm A: direct swap, frUSD and frBTC",
    armABody:
      "Both assets are already on alkanes, so this is a single call to exchange (opcode 5) on 4:1778. The CLI can quote it today but cannot send it: swap, add-liquidity and remove-liquidity all refuse, because the Bitcoin transaction construction they need (UTXO selection, protostone assembly, signing) is not yet reused from the frbtc-wrap path in the same crate. Until it is, execute swaps through the SUBFROST app and use the CLI to quote and to verify.",
    armASteps: [
      "Quote with get_dy (107). Do not compute the curve yourself.",
      "Read the size as bps of the incoming leg and decide if you accept that impact.",
      "Set a slippage bound. The pool's fee band is 0.2% to 0.8% depending on the resulting balance, so a quote taken at one balance and executed at another must tolerate the difference.",
      "Build the protostone, sign, broadcast.",
    ],

    armBTitle: "Arm B: EVM to BTC (deposit)",
    armBBody:
      "The caller holds USDC or USDT on Ethereum and wants frUSD on Bitcoin, optionally converting a share to native BTC on arrival. The vault is 0x95779e7e1c943042255b8a78273fe6de4823cf06 (ERC1967 proxy, L1), with assets(0) = USDC and assets(1) = USDT, both 6 decimals. It takes two calls, in order, and the approve must confirm first.",
    armBSigning:
      "With no key flags the CLI prints the two calls for the user's own wallet, which is the right default for an interactive user. Local signing is deliberately not built: the key flags exist but refuse rather than sign. When it lands, it will submit through /v4/{apikey}/ethereum-builder to keep the transaction out of the public mempool, which matters on this specific trade because the calldata carries the BTC destination and the conversion split, and the Bitcoin leg's min_dy sits in an OP_RETURN until it confirms. A public broadcast hands a searcher advance notice of a swap against a shallow pool.",
    bridgeDataTitle: "bridgeData",
    bridgeDataBody:
      "bridgeData is a protobuf (frusd.bridge.BridgeData). Dispatch is by FIELD PRESENCE, not by the action value.",
    bridgeFields: [
      { f: "1", n: "action", d: "0 (DIRECT_TRANSFER), always" },
      { f: "2", n: "recipient_script", d: "The BTC scriptPubKey the frUSD settles at" },
      { f: "3", n: "recipient_protostone", d: "Optional. MUTUALLY EXCLUSIVE with field 4" },
      { f: "4", n: "btc_conversion", d: "Optional. convert_bps (0..=10000), btc_destination (required when convert_bps > 0), max_slippage_bps (honoured downwards only)" },
    ],
    armBWarnsTitle: "Every failure on this path is silent",
    armBWarns: [
      {
        title: "A malformed bridgeData still succeeds on Ethereum",
        body:
          "The vault stores the bytes verbatim, and the coordinator then pays the operator's fallback recipient instead of the depositor. Validate before signing, because nothing downstream will.",
      },
      {
        title: "btc_destination is the most dangerous field in the system",
        body:
          "frBTC's burn() validates the unwrap pointer's INDEX but never the SCRIPT at it. It copies the script into the payment record and burns the frBTC immediately: no escrow, no expiry, no reclaim. A non-standard destination destroys supply against an address that can never be paid, and the contract will not stop it. Accept only P2PKH, P2SH, or witness v0 to v16, with v0 restricted to the 20 and 32 byte programs. Refuse anything else, do not clean it up.",
      },
      {
        title: "The destination may be someone else's address, and that is supported",
        body:
          "Paying a third party straight out of an EVM balance, or seeding a fresh BTC identity, is a real flow. Both --recipient and --btc-destination are validated for payability, never for ownership, because ownership is not knowable. Note also that the two can differ: --recipient takes the frUSD residue and --btc-destination takes the converted BTC, so one deposit can seed two identities in two assets. There is no recovery from a wrong but payable address.",
      },
      {
        title: "convert_bps out of range is refused, never clamped",
        body: "Somebody who wrote 20000 meant something, and it was not 100%.",
      },
      {
        title: "Approve exactly the deposit amount",
        body:
          "Not uint256::MAX. A standing infinite allowance on a proxy the user does not control outlives the single transaction it was granted for.",
      },
      {
        title: "Use addresses at the user boundary, and require mainnet",
        body:
          "A person can recognise bc1p... and cannot proofread 34 bytes of script hex. A testnet address parses fine and yields a well-formed script that mainnet pays into a hole.",
      },
    ],
    keyHandlingTitle: "Loading an Ethereum key",
    keyHandling:
      "Never ask anyone to paste a private key into a chat. In order of preference: hand off to their wallet with the calldata above, unlock a keystore file locally, or use an environment variable for unattended runs while saying clearly that the key is in the process environment. The --eth-private-key flag is refused unless you also pass --i-know-this-lands-in-shell-history, because it does.",

    armCTitle: "Arm C: BTC to EVM (burn)",
    armCBody:
      "burn goes the other way: frUSD on Bitcoin out to USDC on Ethereum, optionally swapping a share onward into ETH through Uniswap V2. Splitting matters more than it looks: a burner can land most of it as a stablecoin and take enough ETH to pay gas, otherwise a fresh EVM identity receives tokens it cannot move.",
    burnDataTitle: "burnData is NOT protobuf",
    burnDataBody: "It is a raw byte encoding:",
    burnDataEnc: [
      { enc: "empty, or [0x01, 0x00]", means: "Plain transfer" },
      { enc: "[0x01, 0x01, <20-byte target>, <calldata...>]", means: "Call" },
    ],
    armCWarns: [
      {
        title: "amountOutMin is yours to set",
        body:
          "There is no coordinator-side slippage floor on this leg. Passing 0 is an unbounded-loss instruction. The CLI requires --min-out whenever --to-eth-bps > 0 for exactly this reason.",
      },
      {
        title: "One allowlisted target only",
        body:
          "Uniswap V2 Router02 at 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, calldata swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline) with path = [USDC, WETH]. Anything else degrades to a plain payout. V2 and not V3 deliberately: one target.call, no multicall.",
      },
      {
        title: "burn does not broadcast yet",
        body:
          "The burnData payload is authoritative, matched to the coordinator's own parser and unit tested. The frUSD BurnAndBridge cellpack packing around it still needs checking against the integration tests before anything is signed. Guessing that packing is exactly how a burn silently degrades to a plain payout.",
      },
    ],

    watchTitle: "Watching both chains",
    watchBody:
      "A bridge trade is not done when the Bitcoin side settles. Track the frBTC/frUSD signing group's taproot addresses to see rollups land, and check the Ethereum side too. Persist what you submitted (txids, intents, expected outcomes) so a resumed session reconciles rather than re-submits: duplicate submission on a bridge path is a real loss, not an inconvenience.",
    watchWarn:
      "protorunesbyaddress is slow and marginal, measured at about 10.5s against a 15s pool timeout on a busy address. It has already caused an outage. Budget for it, cache it, and do not tighten --interval-secs without measuring.",
    mempoolNote:
      "The mempool routes are live. The CLI's own help text still says they are not deployed, which was true when it was written and is not true now: /v4/{apikey}/mempool answered 200 with a full mempool snapshot at the reading above. Verify before building on it rather than trusting either statement.",
    simulateNote:
      "simulate-block is the MEV lens. It drives every transaction through the same per-tx path the indexer uses, with one shared sandbox carrying writes across transaction boundaries, so it reproduces the intra-block atomicity that decides who wins a contended swap. Use it to ask whether your transaction still gets the quote you expect if it lands after the pending set, and what fee gets you ahead of the trade that would move the price against you.",

    checklistTitle: "Before you execute anything",
    checklist: [
      "For a bridge conversion: is it inside the 1000bps cap? If not, say what will actually happen (frUSD, not BTC).",
      "For a direct swap: have you quoted the EFFECTIVE execution price at your size, not the pool's marginal price?",
      "Is btc_destination a standard, payable, mainnet script?",
      "Is the approve exactly the amount, not unlimited?",
      "Are amounts still strings, not floats?",
      "Did you say out loud that you are on the shared /v4/jsonrpc endpoint, if you are?",
      "Did you say clearly that you are not signing the Ethereum side, because they are?",
    ],
    checklistClose:
      "If you cannot answer all seven, do not broadcast. Explain what is missing.",

    notBuiltTitle: "Not built yet",
    notBuiltIntro:
      "Listed so nobody builds a workflow on top of a command that refuses.",
    notBuilt: [
      "swap, add-liquidity and remove-liquidity: need Bitcoin transaction construction, and refuse rather than emit something that looks right.",
      "deposit local signing: the key flags refuse. The supported path is printing the two calls and signing in your own wallet, which is what the web app does.",
      "burn broadcast: the payload is built and printed, the cellpack packing around it is unverified.",
      "candles and signers: they answer, but print the raw protobuf hex instead of a decoded table.",
    ],
  },
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

function Warn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border border-[color:var(--sf-outline)] bg-[color:var(--sf-surface)] border-l-4 border-l-[color:var(--sf-primary)]">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-[color:var(--sf-muted)]">{children}</p>
    </div>
  );
}

export default function BtcUsdPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <Warn title={t.mainnetWarnTitle}>{t.mainnetWarn}</Warn>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.readRuleTitle}</h2>
        <p>{t.readRule}</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.endpointsTitle}</h2>
        <p className="mb-4">{t.endpointsIntro}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Endpoint</th>
                <th className="text-left py-2 px-3">Serves</th>
              </tr>
            </thead>
            <tbody>
              {t.endpoints.map((e) => (
                <tr key={e.path} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">{e.path}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{e.serves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Warn title={t.keyWarnTitle}>{t.keyWarn}</Warn>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.surfaceTitle}</h2>
        <p className="mb-4">{t.surfaceIntro}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Command</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">What it does</th>
              </tr>
            </thead>
            <tbody>
              {t.surface.map((s) => (
                <tr key={s.cmd} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono whitespace-nowrap">btcusd {s.cmd}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs">
                    {s.status}
                    <span className="block text-[color:var(--sf-muted)]">
                      {t.statusLegend[s.status as keyof typeof t.statusLegend]}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.poolTitle}</h2>
        <p className="mb-4">{t.poolIntro}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {t.poolFacts.map((f) => (
                <tr key={f.k} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-medium whitespace-nowrap">{f.k}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{f.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-semibold mb-2 mt-6">{t.opcodesTitle}</h3>
        <p className="mb-4">{t.opcodesIntro}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {t.opcodes.map((o) => (
            <div
              key={o.op}
              className="flex gap-3 p-2 rounded bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] text-sm"
            >
              <code className="text-[color:var(--sf-primary)] w-10 text-right">{o.op}</code>
              <code>{o.name}</code>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-semibold mb-3 mt-8">{t.trapsTitle}</h3>
        <div className="space-y-3">
          {t.traps.map((w) => (
            <Warn key={w.title} title={w.title}>
              {w.body}
            </Warn>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.measuredTitle}</h2>
        <p className="mb-4 text-[color:var(--sf-muted)]">{t.measuredStamp}</p>
        <CodeBlock>{`export SUBFROST_API_KEY=your_key
alkanes-cli btcusd pool
alkanes-cli btcusd price`}</CodeBlock>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {t.measuredRows.map((r) => (
                <tr key={r.k} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-medium whitespace-nowrap">{r.k}</td>
                  <td className="py-2 px-3 font-mono text-xs">{r.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 mb-0">{t.marketCmdNote}</p>
        <CodeBlock>{`curl -s https://mainnet.subfrost.io/v4/$SUBFROST_API_KEY/espo \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"ammdata.get_btc_usd_price","params":[{}]}'`}</CodeBlock>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.ladderTitle}</h2>
        <p className="mb-4">{t.ladderIntro}</p>

        <h3 className="text-lg font-semibold mb-2">{t.ladderBuyTitle}</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                {t.ladderBuyCols.map((c) => (
                  <th key={c} className="text-left py-2 px-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.ladderBuy.map((row) => (
                <tr key={row[0]} className="border-b border-[color:var(--sf-outline)]">
                  {row.map((cell, i) => (
                    <td key={i} className={i === 0 ? "py-2 px-3 font-medium" : "py-2 px-3 font-mono text-xs"}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold mb-2">{t.ladderSellTitle}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                {t.ladderSellCols.map((c) => (
                  <th key={c} className="text-left py-2 px-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.ladderSell.map((row) => (
                <tr key={row[0]} className="border-b border-[color:var(--sf-outline)]">
                  {row.map((cell, i) => (
                    <td key={i} className={i === 0 ? "py-2 px-3 font-medium" : "py-2 px-3 font-mono text-xs"}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Warn title={t.capTitle}>{t.capBody}</Warn>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.readsTitle}</h2>
        <h3 className="text-lg font-semibold mb-2">{t.quoteTitle}</h3>
        <p className="mb-2 text-[color:var(--sf-muted)]">{t.quoteNote}</p>
        <CodeBlock>{`# $100 of frUSD into frBTC
alkanes-cli btcusd quote --from frusd --amount 10000000000

size: 53bps of the pool's incoming leg. That is PRICE IMPACT, not a limit.
in : 10000000000 frUSD (base units)
out: 155712 frBTC (base units)
implied: 64221 USD/BTC  (EFFECTIVE, not the pool's marginal price)

# 0.001 BTC the other way
alkanes-cli btcusd quote --from frbtc --amount 100000`}</CodeBlock>

        <p className="mb-2 mt-6 text-[color:var(--sf-muted)]">{t.poolCmdNote}</p>
        <CodeBlock>{`alkanes-cli btcusd pool

pool 4:1778 at height 962472
  frUSD reserve         1881214389078  (18812.14389078)
  frBTC reserve              29521902  (0.29521902)
  LP supply      74516779814608897626  (74.516779814608897626, 18 decimals)
  virtual price   1000089524433596945  (1.000089524433596945)
  marginal             15604533105145  (64083.94 USD/BTC)
  depth cap              188121438907  (1881.21438907 frUSD - 1000bps of the reserve)

# OHLC. Buckets 3600 and 86400 only; anything else answers ok:false
# with the supported list rather than erroring.
alkanes-cli btcusd candles --bucket 86400 --limit 30`}</CodeBlock>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.armATitle}</h2>
        <p className="mb-4">{t.armABody}</p>
        <ol className="list-decimal list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.armASteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.armBTitle}</h2>
        <p className="mb-4">{t.armBBody}</p>
        <CodeBlock>{`alkanes-cli btcusd deposit \\
  --stable usdc \\
  --amount 500000000 \\
  --recipient bc1q... \\
  --convert-bps 5000 \\
  --btc-destination bc1q...

deposit  500000000 base units of USDC (assetId 0)
recipient (frUSD)  bc1q...
convert            5000bps to BTC -> bc1q...
max slippage       0bps (honoured downwards only)
approve            exactly 500000000 - NOT an unlimited allowance
bridgeData         0x1216...

1) approve - send to the TOKEN, not the vault
   to    0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
   data  0x095ea7b3...

2) depositAndBridge - send to the VAULT
   to    0x95779e7e1c943042255b8a78273fe6de4823cf06
   data  0xbedb65ee...

No Ethereum key supplied. The two calls above are what you sign, in that
order, and the approve must confirm first.`}</CodeBlock>
        <p className="mb-4">{t.armBSigning}</p>

        <h3 className="text-lg font-semibold mb-2 mt-6">{t.bridgeDataTitle}</h3>
        <p className="mb-3">{t.bridgeDataBody}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Field</th>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {t.bridgeFields.map((f) => (
                <tr key={f.f} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono">{f.f}</td>
                  <td className="py-2 px-3 font-mono text-xs">{f.n}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{f.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold mb-3 mt-8">{t.armBWarnsTitle}</h3>
        <div className="space-y-3">
          {t.armBWarns.map((w) => (
            <Warn key={w.title} title={w.title}>
              {w.body}
            </Warn>
          ))}
        </div>

        <h3 className="text-lg font-semibold mb-2 mt-8">{t.keyHandlingTitle}</h3>
        <p>{t.keyHandling}</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.armCTitle}</h2>
        <p className="mb-4">{t.armCBody}</p>
        <CodeBlock>{`alkanes-cli btcusd burn \\
  --amount 10000000000 \\
  --eth-address 0x... \\
  --to-eth-bps 2000 \\
  --min-out <your floor> \\
  --dry-run

burn 10000000000 frUSD -> 2000bps to ETH via Uniswap V2, rest USDC, to 0x...
min out            <your floor> (YOURS - the coordinator has none here)
burnData           0x0101...`}</CodeBlock>

        <h3 className="text-lg font-semibold mb-2 mt-6">{t.burnDataTitle}</h3>
        <p className="mb-3">{t.burnDataBody}</p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {t.burnDataEnc.map((b) => (
                <tr key={b.enc} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">{b.enc}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{b.means}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3">
          {t.armCWarns.map((w) => (
            <Warn key={w.title} title={w.title}>
              {w.body}
            </Warn>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.watchTitle}</h2>
        <p className="mb-4">{t.watchBody}</p>
        <CodeBlock>{`# the signing group plus the pool, by default
alkanes-cli btcusd watch --interval-secs 30 --max-polls 20

# what is pending, and the blocks a miner would build next
alkanes-cli btcusd mempool info
alkanes-cli btcusd mempool template

# does my transaction still get this quote if it lands after the pending set?
alkanes-cli btcusd simulate --with-mempool
alkanes-cli btcusd simulate-block --insert-tx <rawhex> --at-index 3`}</CodeBlock>
        <div className="space-y-3">
          <Warn title="protorunesbyaddress is slow">{t.watchWarn}</Warn>
          <Warn title="The mempool routes are live now">{t.mempoolNote}</Warn>
          <Warn title="simulate-block is the MEV lens">{t.simulateNote}</Warn>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.checklistTitle}</h2>
        <ol className="list-decimal list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.checklist.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
        <p className="mt-4 font-medium">{t.checklistClose}</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t.notBuiltTitle}</h2>
        <p className="mb-4">{t.notBuiltIntro}</p>
        <ul className="list-disc list-inside space-y-2 text-[color:var(--sf-muted)]">
          {t.notBuilt.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
