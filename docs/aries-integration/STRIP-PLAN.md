# DIESEL Governance Strip Plan

Surgical removal of the DIESEL-governance surface from alkanes.build, redirecting
governance traffic to the canonical venue at `https://surtur.org/proposals`, as a
step toward repositioning the site as the Alkanes developer front door. This
document is a plan only — nothing in this PR removes anything.

## Goal and non-goals

**Goal:** no governance UI, API, or data dependency remains in this codebase;
every governance entry point redirects to `surtur.org/proposals`.

**Non-goals (separate efforts):** the forum stays (it is discussion, not
governance); the docs restructure and homepage redesign are tracked with the
broader front-door redesign, though the homepage loses its governance widgets in
phase 1 below.

## Inventory (what gets touched)

### Pages (remove)
| Route | File |
|---|---|
| `/governance` | `app/[locale]/governance/page.tsx` |
| `/governance/[id]` | `app/[locale]/governance/[id]/page.tsx` |
| `/governance/create` | `app/[locale]/governance/create/page.tsx` |

### Decision-needed pages (DIESEL-coupled, not strictly governance)
| Route | File | Note |
|---|---|---|
| `/terminal` | `app/[locale]/terminal/page.tsx` | DIESEL auto-mint terminal (DieselTerminal, AutoMintPanel). Recommend removing with governance — it is a DIESEL surface, not a developer tool. |
| `/vaults` | `app/[locale]/vaults/page.tsx` | DeFi vaults display. Keep or fold into redesign; not governance per se. |

### Homepage widgets (replace)
`app/[locale]/page.tsx` composes `DieselPriceCard` and `ActiveProposals`.
Phase 1 replaces `ActiveProposals` with a link-out card ("Governance has moved →
surtur.org/proposals") or drops the slot; `DieselPriceCard` removal rides with
the redesign decision on `/terminal`.

### Redirects (add)
In `next.config.ts` `redirects()` (permanent):

```
/:locale/governance          → https://surtur.org/proposals
/:locale/governance/create   → https://surtur.org/proposals
/:locale/governance/:id      → https://surtur.org/proposals
/governance/:path*           → https://surtur.org/proposals   (pre-locale hits)
```

Note: next-intl middleware uses `localePrefix: 'always'`, so both the bare and
locale-prefixed forms need covering; external-destination redirects bypass the
i18n middleware cleanly since redirects run before middleware.

### Navigation (edit)
- `components/Header.tsx` — remove the `/governance` link
- `components/BottomNav.tsx` — remove the governance item (Vote icon)
- `messages/{en,zh,ms,vi,ko}.json` — remove `navigation.governance`; prune the
  `governance` and governance-related `home` namespaces once widgets are gone

### API routes (remove)
- `app/api/governance/proposals/route.ts`
- `app/api/governance/proposals/[id]/route.ts`
- `app/api/governance/vote/route.ts`
- `app/api/governance/voters/route.ts`
- `app/api/competition/route.ts` (DIESEL mint-competition scan + Redis cache)

### Components (remove)
`ActiveProposals`, `DieselPriceCard`, `DieselTerminal`, `AutoMintPanel`,
`components/governance/` (ViewToggle, VotingProgressBar), plus their exports in
`components/index.ts`. `VaultPerformance` follows the `/vaults` decision.

### Library / data layer
- `lib/alkanes-client.ts` — remove `getDieselBalanceAtBlock` and DIESEL
  constants (keep the client itself; block/pool reads stay)
- `lib/pools/*` — keep (pool data is chain data, not governance)
- Prisma models: `Proposal`, `Vote`, `Delegate`, `ProposalState`,
  `VotingPowerSnapshot`, `AddressBalance`, `GovernanceSettings` + governance
  portions of `prisma/seed.ts`. **Two-phase removal — see deploy risk.**

### Docs and content
- `public/docs-meta/navigation.json` — remove the `/docs/concepts/diesel` entry
  (already dangling: no such page exists in the repo)
- `app/[locale]/docs/page.tsx` — remove the "DIESEL Token" concept card and the
  "DIESEL Governance" resource link (point governance mentions at
  surtur.org/proposals)
- `docs/GOVERNANCE.md`, `docs/DIESEL_TERMINAL.md` — delete (repo docs for the
  removed systems); trim the corresponding sections in the repo `CLAUDE.md`
- `public/images/diesel-logo.png` — delete once no references remain

### Tests (remove/adjust)
- `tests/api/governance/*` (3 files), `tests/components/governance/*` (3 files;
  `VotingProgressBar.test.tsx` currently fails on main — expects `#4ade80`,
  component uses `#34d058`)
- `tests/unit/getDieselBalanceAtBlock.test.ts`
- Adjust `tests/api/forum/*` fixtures only if they reference governance
  categories from seed data

## Phasing

1. **Phase 1 — UI + API strip (one PR):** pages, redirects, nav, widgets,
   components, API routes, tests, docs links. Prisma schema untouched — the
   models simply go unused. Site builds and deploys with zero DB changes.
2. **Phase 2 — data cleanup (separate PR, later):** drop governance models from
   `schema.prisma`, prune seed, generate the migration. Run only after phase 1
   has been live and stable.

## Effort estimate

- Phase 1: roughly one focused day (the removal is wide but shallow — most
  files delete whole; the homepage slot and messages pruning are the only
  judgment calls), plus review.
- Phase 2: an hour of schema work, but schedule it around the deploy-risk note
  below.

## Deploy risk (from recon)

- **Merging `main` auto-deploys production.** `.github/workflows/deploy.yml`
  fires on push to `main`: Docker build → Cloud Run (`alkanes-docs`,
  us-central1) behind alkanes.build. There is no manual gate. Strip PRs must be
  reviewed with that in mind; the `workflow_dispatch` staging environment or a
  PR preview (`pr-<N>.alkanes.build`, auto-created per PR) is the place to
  verify first.
- **A Prisma migration job auto-runs after every production deploy** (second
  job in deploy.yml). This is why phase 2 is separate: a destructive
  schema-drop migration must never ride the same merge as the code strip — if
  the deploy succeeds but the migration fails (or vice versa), the site and DB
  disagree. Phase 1 carries no migration, so its rollback is a plain revert.
- Redirects are config-only and roll back with a revert; no data risk.
