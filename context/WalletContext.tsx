'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Import directly from @alkanes/ts-sdk
import {
  AlkanesWallet,
  AddressType,
  createWalletFromMnemonic,
  KeystoreManager,
  createKeystore,
  unlockKeystore,
  KeystoreStorage,
  WalletConnector,
  ConnectedWallet,
  type BrowserWalletInfo,
} from '@alkanes/ts-sdk';

export type Network = 'mainnet' | 'testnet' | 'signet' | 'regtest';

// Storage keys
const STORAGE_KEYS = {
  ENCRYPTED_KEYSTORE: 'alkanes_encrypted_keystore',
  WALLET_NETWORK: 'alkanes_wallet_network',
  SESSION_MNEMONIC: 'alkanes_session_mnemonic',
  BROWSER_WALLET: 'alkanes_browser_wallet',
} as const;

// Map app network names to SDK network names
function toSdkNetwork(network: Network): 'mainnet' | 'testnet' | 'regtest' {
  switch (network) {
    case 'mainnet':
      return 'mainnet';
    case 'testnet':
    case 'signet':
      return 'testnet';
    case 'regtest':
      return 'regtest';
    default:
      return 'mainnet';
  }
}

type Account = {
  taproot?: { address: string; pubkey: string; pubKeyXOnly: string; hdPath: string };
  nativeSegwit?: { address: string; pubkey: string; hdPath: string };
  spendStrategy: { addressOrder: string[]; utxoSortGreatestToLeast: boolean; changeAddress: string };
  network: Network;
};

type FormattedUtxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  scriptPk: string;
  address: string;
  inscriptions: any[];
  runes: any[];
  alkanes: Record<string, { value: string; name: string; symbol: string }>;
  indexed: boolean;
  confirmations: number;
};

type WalletContextType = {
  // Connection state
  isConnectModalOpen: boolean;
  onConnectModalOpenChange: (isOpen: boolean) => void;
  isConnected: boolean;
  isInitializing: boolean;

  // Wallet data
  address: string;
  paymentAddress: string;
  publicKey: string;
  account: Account;
  network: Network;
  wallet: AlkanesWallet | null;
  browserWallet: ConnectedWallet | null;

  // Actions
  createWallet: (password: string) => Promise<{ mnemonic: string }>;
  unlockWallet: (password: string) => Promise<void>;
  restoreWallet: (mnemonic: string, password: string) => Promise<void>;
  connectBrowserWallet: (walletInfo: BrowserWalletInfo) => Promise<void>;
  disconnect: () => void;
  signPsbt: (psbtBase64: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;

  // UTXO methods (placeholder - needs provider integration)
  getUtxos: () => Promise<FormattedUtxo[]>;
  getSpendableUtxos: () => Promise<FormattedUtxo[]>;
  getSpendableTotalBalance: () => Promise<number>;

  // For compatibility
  hasStoredKeystore: boolean;
};

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
  network: Network;
}

export function WalletProvider({ children, network }: WalletProviderProps) {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [wallet, setWallet] = useState<AlkanesWallet | null>(null);
  const [browserWallet, setBrowserWallet] = useState<ConnectedWallet | null>(null);
  const [hasStoredKeystore, setHasStoredKeystore] = useState(false);

  // Check for stored keystore and restore session on mount
  useEffect(() => {
    const initializeWallet = async () => {
      if (typeof window === 'undefined') return;

      const stored = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_KEYSTORE);
      setHasStoredKeystore(!!stored);

      // Check for active session (survives page navigation but not tab close)
      const sessionMnemonic = sessionStorage.getItem(STORAGE_KEYS.SESSION_MNEMONIC);
      if (sessionMnemonic && stored) {
        try {
          const restoredWallet = createWalletFromMnemonic(sessionMnemonic, toSdkNetwork(network));
          setWallet(restoredWallet);
        } catch (error) {
          console.error('Failed to restore session wallet:', error);
          sessionStorage.removeItem(STORAGE_KEYS.SESSION_MNEMONIC);
        }
      }

      setIsInitializing(false);
    };

    initializeWallet();
  }, [network]);

  // Derive addresses from wallet
  const addresses = useMemo(() => {
    if (browserWallet) {
      // Browser wallet - use the connected address
      return {
        nativeSegwit: {
          address: browserWallet.address,
          pubkey: browserWallet.publicKey || '',
          hdPath: '',
        },
        taproot: {
          address: '',
          pubkey: '',
          pubKeyXOnly: '',
          hdPath: '',
        },
      };
    }

    if (!wallet) {
      return {
        nativeSegwit: { address: '', pubkey: '', hdPath: '' },
        taproot: { address: '', pubkey: '', pubKeyXOnly: '', hdPath: '' },
      };
    }

    const segwitInfo = wallet.deriveAddress(AddressType.P2WPKH, 0, 0);
    const taprootInfo = wallet.deriveAddress(AddressType.P2TR, 0, 0);

    return {
      nativeSegwit: {
        address: segwitInfo.address,
        pubkey: segwitInfo.publicKey,
        hdPath: segwitInfo.path,
      },
      taproot: {
        address: taprootInfo.address,
        pubkey: taprootInfo.publicKey,
        pubKeyXOnly: taprootInfo.publicKey.slice(2),
        hdPath: taprootInfo.path,
      },
    };
  }, [wallet, browserWallet]);

  // Build account structure
  const account: Account = useMemo(() => {
    return {
      nativeSegwit: addresses.nativeSegwit.address ? addresses.nativeSegwit : undefined,
      taproot: addresses.taproot.address ? addresses.taproot : undefined,
      spendStrategy: {
        addressOrder: ['nativeSegwit', 'taproot'],
        utxoSortGreatestToLeast: true,
        changeAddress: 'nativeSegwit',
      },
      network,
    };
  }, [addresses, network]);

  // Create new wallet
  const createNewWallet = useCallback(async (password: string): Promise<{ mnemonic: string }> => {
    const sdkNetwork = toSdkNetwork(network);
    const { keystore: encrypted, mnemonic } = await createKeystore(password, { network: sdkNetwork });

    const newWallet = createWalletFromMnemonic(mnemonic, sdkNetwork);

    // Store encrypted keystore
    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_KEYSTORE, encrypted);
    localStorage.setItem(STORAGE_KEYS.WALLET_NETWORK, network);

    // Store mnemonic in session for page navigation persistence
    sessionStorage.setItem(STORAGE_KEYS.SESSION_MNEMONIC, mnemonic);

    setWallet(newWallet);
    setBrowserWallet(null);
    setHasStoredKeystore(true);

    return { mnemonic };
  }, [network]);

  // Unlock existing wallet
  const unlockWalletFn = useCallback(async (password: string): Promise<void> => {
    const encrypted = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_KEYSTORE);
    if (!encrypted) {
      throw new Error('No wallet found. Please create or restore a wallet first.');
    }

    const keystore = await unlockKeystore(encrypted, password);
    const unlockedWallet = createWalletFromMnemonic(keystore.mnemonic, toSdkNetwork(network));

    // Store mnemonic in session for page navigation persistence
    sessionStorage.setItem(STORAGE_KEYS.SESSION_MNEMONIC, keystore.mnemonic);

    setWallet(unlockedWallet);
    setBrowserWallet(null);
  }, [network]);

  // Restore wallet from mnemonic
  const restoreWalletFn = useCallback(async (mnemonic: string, password: string): Promise<void> => {
    const manager = new KeystoreManager();
    const trimmedMnemonic = mnemonic.trim();

    if (!manager.validateMnemonic(trimmedMnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const sdkNetwork = toSdkNetwork(network);
    const restoredWallet = createWalletFromMnemonic(trimmedMnemonic, sdkNetwork);

    // Create keystore and encrypt
    const keystore = manager.createKeystore(trimmedMnemonic, { network: sdkNetwork });
    const encrypted = await manager.exportKeystore(keystore, password, { pretty: true });
    const encryptedStr = typeof encrypted === 'string' ? encrypted : JSON.stringify(encrypted, null, 2);

    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_KEYSTORE, encryptedStr);
    localStorage.setItem(STORAGE_KEYS.WALLET_NETWORK, network);
    sessionStorage.setItem(STORAGE_KEYS.SESSION_MNEMONIC, trimmedMnemonic);

    setWallet(restoredWallet);
    setBrowserWallet(null);
    setHasStoredKeystore(true);
  }, [network]);

  // Connect browser wallet
  const connectBrowserWalletFn = useCallback(async (walletInfo: BrowserWalletInfo): Promise<void> => {
    const connector = new WalletConnector();
    const connected = await connector.connect(walletInfo);

    setBrowserWallet(connected);
    setWallet(null);

    // Store that we're using a browser wallet
    sessionStorage.setItem(STORAGE_KEYS.BROWSER_WALLET, walletInfo.id);
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_MNEMONIC);
    sessionStorage.removeItem(STORAGE_KEYS.BROWSER_WALLET);

    if (browserWallet) {
      browserWallet.disconnect().catch(console.error);
    }

    setWallet(null);
    setBrowserWallet(null);
    setIsConnectModalOpen(false);
  }, [browserWallet]);

  // Sign PSBT
  const signPsbt = useCallback(async (psbtBase64: string): Promise<string> => {
    if (browserWallet) {
      // Convert base64 to hex for browser wallet signing
      const psbtBytes = Uint8Array.from(atob(psbtBase64), c => c.charCodeAt(0));
      const psbtHex = Array.from(psbtBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      return browserWallet.signPsbt(psbtHex);
    }

    if (!wallet) {
      throw new Error('Wallet not connected');
    }
    return wallet.signPsbt(psbtBase64);
  }, [wallet, browserWallet]);

  // Sign message
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (browserWallet) {
      return browserWallet.signMessage(message);
    }

    if (!wallet) {
      throw new Error('Wallet not connected');
    }
    return wallet.signMessage(message, 0);
  }, [wallet, browserWallet]);

  // Placeholder UTXO methods - need provider integration
  const getUtxos = useCallback(async (): Promise<FormattedUtxo[]> => {
    // TODO: Implement with provider
    return [];
  }, []);

  const getSpendableUtxos = useCallback(async (): Promise<FormattedUtxo[]> => {
    // TODO: Implement with provider
    return [];
  }, []);

  const getSpendableTotalBalance = useCallback(async (): Promise<number> => {
    // TODO: Implement with provider
    return 0;
  }, []);

  const onConnectModalOpenChange = useCallback((isOpen: boolean) => {
    setIsConnectModalOpen(isOpen);
  }, []);

  // Build context value
  const contextValue = useMemo<WalletContextType>(
    () => ({
      isConnectModalOpen,
      onConnectModalOpenChange,
      isConnected: !!(wallet || browserWallet),
      isInitializing,

      address: addresses.taproot.address || addresses.nativeSegwit.address,
      paymentAddress: addresses.nativeSegwit.address,
      publicKey: addresses.nativeSegwit.pubkey,
      account,
      network,
      wallet,
      browserWallet,

      createWallet: createNewWallet,
      unlockWallet: unlockWalletFn,
      restoreWallet: restoreWalletFn,
      connectBrowserWallet: connectBrowserWalletFn,
      disconnect,
      signPsbt,
      signMessage,

      getUtxos,
      getSpendableUtxos,
      getSpendableTotalBalance,

      hasStoredKeystore,
    }),
    [
      isConnectModalOpen,
      onConnectModalOpenChange,
      wallet,
      browserWallet,
      isInitializing,
      addresses,
      account,
      network,
      createNewWallet,
      unlockWalletFn,
      restoreWalletFn,
      connectBrowserWalletFn,
      disconnect,
      signPsbt,
      signMessage,
      getUtxos,
      getSpendableUtxos,
      getSpendableTotalBalance,
      hasStoredKeystore,
    ]
  );

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
