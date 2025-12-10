"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// Import from our wallet integration layer (not directly from ts-sdk)
import {
  type Network,
  type AlkanesWalletInstance,
  checkSdkAvailable,
  initAlkanesWasm,
  setupAlkanesWallet,
  restoreAlkanesWallet,
  restoreFromMnemonic,
  saveKeystoreToStorage,
  loadKeystoreFromStorage,
  clearKeystoreFromStorage,
  hasStoredKeystore as checkHasStoredKeystore,
  isSdkAvailable,
} from "@/lib/oyl/alkanes";

export type { Network };

export interface WalletAccount {
  taproot?: {
    address: string;
    pubkey: string;
    pubKeyXOnly: string;
    hdPath: string;
  };
  nativeSegwit?: {
    address: string;
    pubkey: string;
    hdPath: string;
  };
}

export interface FormattedUtxo {
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
}

export interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isConnectModalOpen: boolean;
  onConnectModalOpenChange: (isOpen: boolean) => void;

  // Wallet data
  address: string;
  taprootAddress: string;
  publicKey: string;
  account: WalletAccount | null;
  network: Network;

  // Actions
  connect: (password: string) => Promise<void>;
  createWallet: (password: string) => Promise<{ mnemonic: string }>;
  restoreWallet: (mnemonic: string, password: string) => Promise<void>;
  disconnect: () => void;

  // Signing
  signMessage: (message: string) => Promise<string>;
  signPsbt: (psbtBase64: string) => Promise<string>;

  // Queries
  getUtxos: () => Promise<FormattedUtxo[]>;
  getBalance: () => Promise<number>;
  getDieselBalance: () => Promise<bigint>;

  // Error state
  error: string | null;

  // SDK availability
  sdkAvailable: boolean;
  hasStoredWallet: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
  network: Network;
}

export function WalletProvider({ children, network }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [taprootAddress, setTaprootAddress] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [wallet, setWallet] = useState<AlkanesWalletInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [hasStoredWallet, setHasStoredWallet] = useState(false);

  // Initialize SDK and check for stored wallet on mount
  useEffect(() => {
    async function init() {
      await initAlkanesWasm();
      setSdkAvailable(isSdkAvailable());
      setHasStoredWallet(checkHasStoredKeystore());
    }
    init();
  }, []);

  // Update account state helper
  function updateAccountState(
    walletInstance: AlkanesWalletInstance,
    segwitAddr: string,
    tapAddr: string
  ) {
    const segwitInfo = walletInstance.deriveAddress("p2wpkh", 0, 0);
    const taprootInfo = walletInstance.deriveAddress("p2tr", 0, 0);

    setWallet(walletInstance);
    setAddress(segwitAddr);
    setTaprootAddress(tapAddr);
    setPublicKey(segwitInfo.publicKey);
    setAccount({
      nativeSegwit: {
        address: segwitAddr,
        pubkey: segwitInfo.publicKey,
        hdPath: segwitInfo.path || "m/84'/0'/0'/0/0",
      },
      taproot: {
        address: tapAddr,
        pubkey: taprootInfo.publicKey,
        pubKeyXOnly: taprootInfo.publicKey.slice(2),
        hdPath: "m/86'/0'/0'/0/0",
      },
    });
    setIsConnected(true);
    setIsConnectModalOpen(false);
  }

  // Create new wallet
  const createWallet = useCallback(
    async (password: string): Promise<{ mnemonic: string }> => {
      setIsConnecting(true);
      setError(null);

      try {
        const result = await setupAlkanesWallet(password, network);

        // Save to storage
        saveKeystoreToStorage(result.keystore, network);
        setHasStoredWallet(true);

        // Update state
        updateAccountState(result.wallet, result.address, result.taprootAddress);

        return { mnemonic: result.mnemonic };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create wallet";
        setError(message);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [network]
  );

  // Restore wallet from mnemonic
  const restoreWallet = useCallback(
    async (mnemonic: string, password: string): Promise<void> => {
      setIsConnecting(true);
      setError(null);

      try {
        const result = await restoreFromMnemonic(mnemonic, password, network);

        // Save to storage
        saveKeystoreToStorage(result.keystore, network);
        setHasStoredWallet(true);

        // Update state
        updateAccountState(result.wallet, result.address, result.taprootAddress);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to restore wallet";
        setError(message);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [network]
  );

  // Connect with existing keystore
  const connect = useCallback(
    async (password: string): Promise<void> => {
      setIsConnecting(true);
      setError(null);

      try {
        const stored = loadKeystoreFromStorage();
        if (!stored) {
          throw new Error("No wallet found. Please create or restore a wallet.");
        }

        const result = await restoreAlkanesWallet(stored.keystore, password, stored.network);

        // Update state
        updateAccountState(result.wallet, result.address, result.taprootAddress);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to connect wallet";
        setError(message);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  // Disconnect
  const disconnect = useCallback(() => {
    setWallet(null);
    setAddress("");
    setTaprootAddress("");
    setPublicKey("");
    setAccount(null);
    setIsConnected(false);
    // Don't clear storage - user can reconnect with password
  }, []);

  // Sign message using BIP-322 (via wallet integration)
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!wallet || !address) {
        throw new Error("Wallet not connected");
      }

      try {
        return await wallet.signMessage(message, 0);
      } catch (err) {
        console.error("Sign message error:", err);
        throw err;
      }
    },
    [wallet, address]
  );

  // Sign PSBT
  const signPsbt = useCallback(
    async (psbtBase64: string): Promise<string> => {
      if (!wallet) {
        throw new Error("Wallet not connected");
      }

      return wallet.signPsbt(psbtBase64);
    },
    [wallet]
  );

  // Get UTXOs (placeholder - needs provider integration)
  const getUtxos = useCallback(async (): Promise<FormattedUtxo[]> => {
    if (!address) {
      return [];
    }
    // TODO: Implement UTXO fetching via provider
    console.log("getUtxos: needs provider integration");
    return [];
  }, [address]);

  // Get balance
  const getBalance = useCallback(async (): Promise<number> => {
    const utxos = await getUtxos();
    return utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
  }, [getUtxos]);

  // Get DIESEL balance (placeholder - needs provider integration)
  const getDieselBalance = useCallback(async (): Promise<bigint> => {
    if (!address) {
      return BigInt(0);
    }
    // TODO: Implement DIESEL balance fetching via provider
    // DIESEL is at alkane ID [2, 0]
    console.log("getDieselBalance: needs provider integration");
    return BigInt(0);
  }, [address]);

  const value: WalletContextType = {
    isConnected,
    isConnecting,
    isConnectModalOpen,
    onConnectModalOpenChange: setIsConnectModalOpen,
    address,
    taprootAddress,
    publicKey,
    account,
    network,
    connect,
    createWallet,
    restoreWallet,
    disconnect,
    signMessage,
    signPsbt,
    getUtxos,
    getBalance,
    getDieselBalance,
    error,
    sdkAvailable,
    hasStoredWallet,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

// Re-export for convenience
export { checkHasStoredKeystore as hasStoredKeystore };
