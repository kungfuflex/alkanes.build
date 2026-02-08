# Connect Wallet Modal — Design Documentation

## Overview

`components/ConnectWalletModal.tsx` — wallet connection modal. Redesigned to match the dark theme of the application.

## Screen Structure (Views)

```
select (main screen)
├── unlock              — Unlock existing wallet
├── create              — Create new wallet
│   └── show-mnemonic   — Display recovery phrase
├── restore             — Intermediate restore screen
│   ├── restore-mnemonic        — Restore from mnemonic
│   ├── restore-json            — Restore from keystore file
│   └── restore-drive-picker    — Pick backup from Google Drive
│       └── restore-drive-unlock — Unlock backup
└── browser-extension   — Connect browser extension
```

## Navigation

- `ChevronLeft` arrow (22px) in the top-left corner — shown on all screens except `select`
- `X` close button (22px) in the top-right corner — closes the modal from any screen
- Back navigation is defined via `backMap`:
  - `create`, `unlock`, `restore`, `browser-extension`, `show-mnemonic` → `select`
  - `restore-mnemonic`, `restore-json`, `restore-drive-picker` → `restore`
  - `restore-drive-unlock` → `restore-drive-picker`

## Main Menu Items

| Item | Icon | Color | Show Condition |
|------|------|-------|----------------|
| Unlock Wallet | Lock | blue-400 | `hasExistingKeystore` |
| Create Wallet | Plus | green-400 | always |
| Restore Wallet | Key | yellow-400 | always |
| Connect Extension | Download | purple-400 | always |
| Delete stored wallet | — | red-500 | `hasExistingKeystore` |

## Restore Menu Items

| Item | Icon | Color | Condition |
|------|------|-------|-----------|
| Recovery Phrase | Key | yellow-400 | always |
| Keystore File | Upload | orange-400 | always |
| Google Drive | Cloud | sky-400 | `driveConfigured` |

## Design

### Modal

- Width: `400px` (max `92vw`)
- Background: `#1a1a1a` (slightly lighter than app background `#0d0d0d`)
- Border: `1px solid rgba(255, 255, 255, 0.08)`
- Border radius: `rounded-3xl`
- Backdrop: `bg-black/25 backdrop-blur-sm`

### Menu Cards (SelectRow)

- Background: `#232323` (opaque)
- Hover: `#2a2a2a`
- Border radius: `rounded-2xl`
- Padding: `px-5 py-4`
- Layout: text on the left, icon in a `9x9` container on the right
- Icon container: `bg-white/[0.06] rounded-lg`
- Text: `text-base font-semibold`
- Spacing between cards: `space-y-3`

### Inputs (InputField)

- Background: `bg-black/30`
- Border: `border-[color:var(--sf-outline)]`, focus: `border-white/20`
- Border radius: `rounded-xl`
- Padding: `px-4 py-3`
- Text: `text-base font-medium`
- Label: `text-[13px] font-semibold uppercase tracking-widest`

### Buttons

- Primary: `bg-white text-black rounded-xl py-3 text-base font-medium`
- No separate Back button — navigation via header arrow

### Section Headers

- `text-[13px] font-bold uppercase tracking-widest text-[color:var(--sf-muted)]`

## Animations

### Open

- Backdrop: `fadeIn 150ms ease-out`
- Modal: `modalIn 200ms ease-out` (opacity 0→1, scale 0.97→1, translateY 6px→0)

### Close

- Backdrop: `fadeOut 100ms ease-in forwards`
- Modal: `modalOut 100ms ease-in forwards` (reverse of `modalIn`)
- Closing via `isClosing` state + `setTimeout(100ms)` to delay unmount

### Height Transition

- Content wrapped in a div with `transition: height 200ms cubic-bezier(0.4, 0, 0.2, 1)`
- Height measured via `useLayoutEffect` + `innerRef.scrollHeight`
- Recalculated on changes to: `view`, `error`, `hasExistingKeystore`, `driveConfigured`, `uploadedKeystore`, `walletOptions`, `driveBackups`, `generatedMnemonic`

### CSS Keyframes (globals.css)

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes modalOut {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.97) translateY(6px); }
}
```

## Sub-components

Defined at the end of the file as simple functions:

- **`SelectRow`** — menu card (icon, label, onClick, disabled)
- **`InputField`** — input field with label and password toggle
- **`ErrorMessage`** — error block with red border
- **`PrimaryButton`** — white action button

## Header Button

`components/Header.tsx` — "Connect Wallet" button:
- Class: `btn-primary text-[13px] !px-5 !py-2.5 !rounded-xl`
- Shown only on `sm+` screens
- On mobile — via mobile menu

## Dependencies

- `@alkanes/ts-sdk` — types (`BrowserWalletInfo`, `WalletBackupInfo`, `WalletOption`), `BROWSER_WALLETS`, `GoogleDriveBackup`, `unlockKeystore`
- `@/context/WalletContext` — `useWallet` hook
- `lucide-react` — icons
