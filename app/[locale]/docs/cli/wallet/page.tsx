"use client";

import { useLocale } from "next-intl";

const content = {
  en: {
    title: "Wallet Commands",
    intro: "The wallet namespace provides HD wallet management, address derivation, transaction signing, and balance queries.",
    overviewTitle: "Commands Overview",
    commands: [
      { cmd: "create", desc: "Create a new wallet or restore from mnemonic" },
      { cmd: "addresses", desc: "Display wallet addresses" },
      { cmd: "utxos", desc: "List UTXOs in the wallet" },
      { cmd: "balance", desc: "Get wallet balance" },
      { cmd: "send", desc: "Send a transaction" },
      { cmd: "sign", desc: "Sign a PSBT" },
      { cmd: "create-tx", desc: "Create an unsigned transaction" },
      { cmd: "sign-tx", desc: "Sign a transaction" },
      { cmd: "decode-tx", desc: "Decode a transaction" },
      { cmd: "broadcast-tx", desc: "Broadcast a transaction" },
      { cmd: "fee-rates", desc: "Get current fee rates" },
      { cmd: "history", desc: "Get transaction history" },
      { cmd: "mnemonic", desc: "Display wallet mnemonic" },
      { cmd: "freeze/unfreeze", desc: "Freeze/unfreeze UTXOs" },
      { cmd: "backup", desc: "Backup the wallet" }
    ],
    createTitle: "wallet create",
    createDesc: "Create a new HD wallet or restore from a mnemonic.",
    addressesTitle: "wallet addresses",
    addressesDesc: "Display all derived addresses from the wallet.",
    balanceTitle: "wallet balance",
    balanceDesc: "Get the BTC balance of the wallet.",
    utxosTitle: "wallet utxos",
    utxosDesc: "List all unspent transaction outputs (UTXOs) in the wallet.",
    sendTitle: "wallet send",
    sendDesc: "Send BTC to an address.",
    feeRatesTitle: "wallet fee-rates",
    feeRatesDesc: "Get current network fee rate estimates.",
    createTxTitle: "wallet create-tx",
    createTxDesc: "Create an unsigned transaction without broadcasting.",
    signTxTitle: "wallet sign-tx",
    signTxDesc: "Sign a transaction from a hex file.",
    decodeTxTitle: "wallet decode-tx",
    decodeTxDesc: "Decode and display transaction details.",
    broadcastTxTitle: "wallet broadcast-tx",
    broadcastTxDesc: "Broadcast a signed transaction to the network.",
    signTitle: "wallet sign",
    signDesc: "Sign a PSBT (Partially Signed Bitcoin Transaction).",
    mnemonicTitle: "wallet mnemonic",
    mnemonicDesc: "Display the wallet's mnemonic phrase (use with caution!).",
    freezeTitle: "wallet freeze / unfreeze",
    freezeDesc: "Freeze or unfreeze specific UTXOs to prevent them from being spent.",
    backupTitle: "wallet backup",
    backupDesc: "Create a backup of the wallet file.",
    historyTitle: "wallet history",
    historyDesc: "Get transaction history for the wallet.",
    exampleTitle: "Complete TypeScript Example"
  },
  zh: {
    title: "钱包命令",
    intro: "wallet 命名空间提供 HD 钱包管理、地址派生、交易签名和余额查询功能。",
    overviewTitle: "命令概览",
    commands: [
      { cmd: "create", desc: "创建新钱包或从助记词恢复" },
      { cmd: "addresses", desc: "显示钱包地址" },
      { cmd: "utxos", desc: "列出钱包中的 UTXO" },
      { cmd: "balance", desc: "获取钱包余额" },
      { cmd: "send", desc: "发送交易" },
      { cmd: "sign", desc: "签署 PSBT" },
      { cmd: "create-tx", desc: "创建未签名交易" },
      { cmd: "sign-tx", desc: "签署交易" },
      { cmd: "decode-tx", desc: "解码交易" },
      { cmd: "broadcast-tx", desc: "广播交易" },
      { cmd: "fee-rates", desc: "获取当前费率" },
      { cmd: "history", desc: "获取交易历史" },
      { cmd: "mnemonic", desc: "显示钱包助记词" },
      { cmd: "freeze/unfreeze", desc: "冻结/解冻 UTXO" },
      { cmd: "backup", desc: "备份钱包" }
    ],
    createTitle: "wallet create",
    createDesc: "创建新的 HD 钱包或从助记词恢复。",
    addressesTitle: "wallet addresses",
    addressesDesc: "显示钱包的所有派生地址。",
    balanceTitle: "wallet balance",
    balanceDesc: "获取钱包的 BTC 余额。",
    utxosTitle: "wallet utxos",
    utxosDesc: "列出钱包中所有未花费的交易输出（UTXO）。",
    sendTitle: "wallet send",
    sendDesc: "向地址发送 BTC。",
    feeRatesTitle: "wallet fee-rates",
    feeRatesDesc: "获取当前网络费率估算。",
    createTxTitle: "wallet create-tx",
    createTxDesc: "创建未签名交易而不广播。",
    signTxTitle: "wallet sign-tx",
    signTxDesc: "从十六进制文件签署交易。",
    decodeTxTitle: "wallet decode-tx",
    decodeTxDesc: "解码并显示交易详情。",
    broadcastTxTitle: "wallet broadcast-tx",
    broadcastTxDesc: "向网络广播已签名交易。",
    signTitle: "wallet sign",
    signDesc: "签署 PSBT（部分签名比特币交易）。",
    mnemonicTitle: "wallet mnemonic",
    mnemonicDesc: "显示钱包助记词（谨慎使用！）",
    freezeTitle: "wallet freeze / unfreeze",
    freezeDesc: "冻结或解冻特定 UTXO 以防止被花费。",
    backupTitle: "wallet backup",
    backupDesc: "创建钱包文件备份。",
    historyTitle: "wallet history",
    historyDesc: "获取钱包的交易历史。",
    exampleTitle: "完整 TypeScript 示例"
  }
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] overflow-x-auto text-sm my-4">
      <code>{children}</code>
    </pre>
  );
}

export default function WalletCommandsPage() {
  const locale = useLocale();
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg text-[color:var(--sf-muted)]">{t.intro}</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t.overviewTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--sf-outline)]">
                <th className="text-left py-2 px-3">Command</th>
                <th className="text-left py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {t.commands.map((cmd, i) => (
                <tr key={i} className="border-b border-[color:var(--sf-outline)]">
                  <td className="py-2 px-3 font-mono">{cmd.cmd}</td>
                  <td className="py-2 px-3 text-[color:var(--sf-muted)]">{cmd.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.createTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.createDesc}</p>
        <CodeBlock>{`# Create new wallet with random mnemonic
alkanes-cli wallet create --passphrase "your-secure-passphrase"

# Restore from existing mnemonic
alkanes-cli wallet create "word1 word2 word3 ... word12" \\
  --passphrase "your-passphrase"

# Specify output file
alkanes-cli wallet create --passphrase "your-passphrase" \\
  --output /custom/path/wallet.json`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.addressesTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.addressesDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-passphrase" \\
  wallet addresses`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.balanceTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.balanceDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-passphrase" \\
  wallet balance`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.sendTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.sendDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-passphrase" \\
  wallet send <ADDRESS> <AMOUNT_SATS> \\
  --fee-rate 10 \\
  -y  # Auto-confirm`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.feeRatesTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.feeRatesDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  wallet fee-rates

# Output:
# Fast: 15 sat/vB
# Medium: 8 sat/vB
# Slow: 3 sat/vB`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.signTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.signDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --wallet-file ~/.alkanes/wallet.json \\
  --passphrase "your-passphrase" \\
  wallet sign --psbt <PSBT_BASE64>`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.broadcastTxTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.broadcastTxDesc}</p>
        <CodeBlock>{`alkanes-cli -p mainnet \\
  --jsonrpc-url https://mainnet.subfrost.io/v4/jsonrpc \\
  wallet broadcast-tx --file /path/to/signed_tx.hex`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.freezeTitle}</h2>
        <p className="text-[color:var(--sf-muted)] mb-4">{t.freezeDesc}</p>
        <CodeBlock>{`# Freeze a UTXO
alkanes-cli wallet freeze <TXID>:<VOUT>

# Unfreeze a UTXO
alkanes-cli wallet unfreeze <TXID>:<VOUT>`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{t.exampleTitle}</h2>
        <CodeBlock>{`import {
  createKeystore,
  unlockKeystore,
  createWallet,
  createProvider,
  AddressType
} from '@alkanes/ts-sdk';
import * as bitcoin from 'bitcoinjs-lib';

async function main() {
  // Create wallet
  const { keystore, mnemonic } = await createKeystore('password123', {
    network: 'mainnet'
  });

  console.log('Mnemonic (save securely!):', mnemonic);

  // Unlock and use
  const unlocked = await unlockKeystore(keystore, 'password123');
  const wallet = createWallet(unlocked);

  // Get addresses
  const taprootAddr = wallet.getReceivingAddress(0);
  const segwitAddr = wallet.deriveAddress(AddressType.P2WPKH, 0);

  console.log('Taproot:', taprootAddr);
  console.log('SegWit:', segwitAddr);

  // Create provider
  const provider = createProvider({
    url: 'https://mainnet.subfrost.io/v4/jsonrpc',
    network: bitcoin.networks.bitcoin,
    networkType: 'mainnet',
  });

  // Check balance
  const balance = await provider.getBalance(taprootAddr);
  console.log('Balance:', balance);
}`}</CodeBlock>
      </div>
    </div>
  );
}
