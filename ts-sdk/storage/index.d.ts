/**
 * Storage and Backup Module for Alkanes SDK
 *
 * Provides:
 * - Local storage for keystore persistence
 * - Google Drive backup/restore for encrypted keystores
 * - Session storage for temporary wallet state
 *
 * @example
 * ```typescript
 * import { KeystoreStorage, GoogleDriveBackup } from '@alkanes/ts-sdk';
 *
 * // Local storage
 * const storage = new KeystoreStorage();
 * storage.saveKeystore(encryptedKeystore, 'mainnet');
 * const { keystore, network } = storage.loadKeystore();
 *
 * // Google Drive backup
 * const drive = new GoogleDriveBackup();
 * await drive.initialize();
 * await drive.backupWallet(encryptedKeystore, 'My Wallet', 'password hint');
 * const wallets = await drive.listWallets();
 * ```
 */
/**
 * Local keystore storage manager
 */
export declare class KeystoreStorage {
    /**
     * Save encrypted keystore to localStorage
     */
    saveKeystore(keystoreJson: string, network: string): void;
    /**
     * Load encrypted keystore from localStorage
     */
    loadKeystore(): {
        keystore: string;
        network: string;
    } | null;
    /**
     * Check if a keystore exists in localStorage
     */
    hasKeystore(): boolean;
    /**
     * Clear keystore from localStorage
     */
    clearKeystore(): void;
    /**
     * Save wallet state to sessionStorage (survives page navigation, cleared on tab close)
     */
    saveSessionWallet(walletState: any): void;
    /**
     * Load wallet state from sessionStorage
     */
    loadSessionWallet(): any | null;
    /**
     * Clear session wallet state
     */
    clearSessionWallet(): void;
}
/**
 * Wallet backup information from Google Drive
 */
export interface WalletBackupInfo {
    folderId: string;
    folderName: string;
    walletLabel: string;
    timestamp: string;
    createdDate: string;
    hasPasswordHint: boolean;
    folderUrl: string;
}
/**
 * Restored wallet data from Google Drive
 */
export interface RestoreWalletResult {
    encryptedKeystore: string;
    passwordHint: string | null;
    walletLabel: string;
    timestamp: string;
}
/**
 * Google Drive backup manager
 *
 * Client-side only - no backend involvement.
 * OAuth tokens are kept in memory only for security.
 */
export declare class GoogleDriveBackup {
    private clientId;
    private accessToken;
    private gapiInited;
    private gsiInited;
    constructor(clientId?: string);
    /**
     * Check if Google Drive backup is configured
     */
    isConfigured(): boolean;
    /**
     * Initialize Google API and Identity Services
     * Must be called before any Drive operations
     */
    initialize(): Promise<void>;
    /**
     * Request OAuth access token from user (opens popup)
     */
    requestAccess(): Promise<string>;
    /**
     * Clear access token and revoke with Google
     */
    clearAccess(): void;
    /**
     * Backup wallet to Google Drive
     */
    backupWallet(encryptedKeystore: string, walletLabel?: string, passwordHint?: string): Promise<{
        folderId: string;
        folderName: string;
        timestamp: string;
        folderUrl: string;
    }>;
    /**
     * List all wallet backups from Google Drive
     */
    listWallets(): Promise<WalletBackupInfo[]>;
    /**
     * Restore wallet from Google Drive
     */
    restoreWallet(folderId: string): Promise<RestoreWalletResult>;
    /**
     * Delete a wallet backup from Google Drive
     */
    deleteWallet(folderId: string): Promise<void>;
    private initGapi;
    private initGsi;
    private getOrCreateRootFolder;
    private uploadFile;
}
/**
 * Format timestamp for display
 */
export declare function formatBackupDate(timestamp: string): string;
/**
 * Get relative time string
 */
export declare function getRelativeTime(timestamp: string): string;
//# sourceMappingURL=index.d.ts.map