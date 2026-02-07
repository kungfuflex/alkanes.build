'use client';

import { ChevronLeft, ChevronRight, Plus, Key, Lock, Eye, EyeOff, Copy, Check, Download, Cloud, Upload, X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';

import { useWallet } from '@/context/WalletContext';
import {
  BROWSER_WALLETS,
  GoogleDriveBackup,
  unlockKeystore,
  type BrowserWalletInfo,
  type WalletBackupInfo,
  type WalletOption,
} from '@alkanes/ts-sdk';

type WalletView = 'select' | 'create' | 'restore' | 'restore-mnemonic' | 'restore-json' | 'restore-drive-picker' | 'restore-drive-unlock' | 'browser-extension' | 'unlock' | 'show-mnemonic';

export default function ConnectWalletModal() {
  const {
    network,
    isConnectModalOpen,
    onConnectModalOpenChange,
    hasStoredKeystore: hasExistingKeystoreFromContext,
    createWallet: createWalletFromContext,
    unlockWallet: unlockWalletFromContext,
    restoreWallet: restoreWalletFromContext,
    connectBrowserWallet,
    disconnect,
    getWalletOptions,
  } = useWallet();

  const [view, setView] = useState<WalletView>('select');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHintInput, setPasswordHintInput] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasExistingKeystore, setHasExistingKeystore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [driveBackups, setDriveBackups] = useState<WalletBackupInfo[]>([]);
  const [selectedDriveWallet, setSelectedDriveWallet] = useState<WalletBackupInfo | null>(null);
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [uploadedKeystore, setUploadedKeystore] = useState<string | null>(null);
  const [driveBackup] = useState(() => new GoogleDriveBackup());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const installedWallets = walletOptions.filter(w => w.installed);
  const allWallets = walletOptions;

  useEffect(() => {
    if (isConnectModalOpen) {
      setIsVisible(true);
      setIsClosing(false);
      setHasExistingKeystore(hasExistingKeystoreFromContext);
      setView('select');
      resetForm();
      getWalletOptions().then(setWalletOptions).catch(console.error);
      setDriveConfigured(driveBackup.isConfigured());
    }
  }, [isConnectModalOpen, hasExistingKeystoreFromContext, driveBackup, getWalletOptions]);

  // Measure and animate content height on view change
  const measureHeight = useCallback(() => {
    if (innerRef.current) {
      setContentHeight(innerRef.current.scrollHeight);
    }
  }, []);

  useLayoutEffect(() => {
    measureHeight();
  }, [view, error, hasExistingKeystore, driveConfigured, uploadedKeystore, walletOptions, driveBackups, generatedMnemonic, measureHeight]);

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setMnemonic('');
    setGeneratedMnemonic('');
    setError(null);
    setIsLoading(false);
    setShowPassword(false);
    setCopied(false);
    setMnemonicConfirmed(false);
    setUploadedKeystore(null);
    setDriveBackups([]);
    setSelectedDriveWallet(null);
    setPasswordHint(null);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onConnectModalOpenChange(false);
      resetForm();
      setIsVisible(false);
      setIsClosing(false);
    }, 140);
  };

  const handleCreateWallet = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createWalletFromContext(password);
      setGeneratedMnemonic(result.mnemonic);
      setView('show-mnemonic');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupToDrive = async () => {
    if (!generatedMnemonic || !password) {
      setError('Missing wallet data for backup');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await driveBackup.initialize();
      const encrypted = localStorage.getItem('alkanes_encrypted_keystore');

      if (!encrypted) {
        throw new Error('Encrypted keystore not found');
      }

      await driveBackup.backupWallet(
        encrypted,
        'My Bitcoin Wallet',
        passwordHintInput || undefined
      );

      alert('Wallet backed up to your Google Drive!');
    } catch (err) {
      console.error('Drive backup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to backup to Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmMnemonic = () => {
    handleClose();
  };

  const handleRestoreFromMnemonic = async () => {
    if (!mnemonic.trim()) {
      setError('Please enter your mnemonic phrase');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await restoreWalletFromContext(mnemonic.trim(), password);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockKeystore = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await unlockWalletFromContext(password);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKeystore = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('alkanes_encrypted_keystore');
      localStorage.removeItem('alkanes_wallet_network');
    }
    disconnect();
    setHasExistingKeystore(false);
    setView('select');
  };

  const copyMnemonic = async () => {
    await navigator.clipboard.writeText(generatedMnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadDriveBackups = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await driveBackup.initialize();
      const wallets = await driveBackup.listWallets();
      setDriveBackups(wallets);
      setView('restore-drive-picker');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDriveWallet = async (walletInfo: WalletBackupInfo) => {
    setSelectedDriveWallet(walletInfo);
    setIsLoading(true);
    setError(null);

    try {
      const result = await driveBackup.restoreWallet(walletInfo.folderId);
      setMnemonic(result.encryptedKeystore);
      setPasswordHint(result.passwordHint);
      setView('restore-drive-unlock');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const keystore = await unlockKeystore(mnemonic, password);
      await restoreWalletFromContext(keystore.mnemonic, password);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock wallet. Check your password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        JSON.parse(content);
        setUploadedKeystore(content);
        setError(null);
      } catch {
        setError('Invalid keystore file. Please upload a valid JSON keystore.');
        setUploadedKeystore(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setUploadedKeystore(null);
    };
    reader.readAsText(file);
  };

  const handleRestoreFromJson = async () => {
    if (!uploadedKeystore) {
      setError('Please upload a keystore file');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const keystore = await unlockKeystore(uploadedKeystore, password);
      await restoreWalletFromContext(keystore.mnemonic, password);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock wallet. Check your password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectBrowserWallet = async (wallet: WalletOption | BrowserWalletInfo) => {
    setIsLoading(true);
    setError(null);

    try {
      const walletInfo: BrowserWalletInfo = 'injectionKey' in wallet
        ? wallet
        : BROWSER_WALLETS.find((w: BrowserWalletInfo) => w.id === wallet.id) || {
            id: wallet.id,
            name: wallet.name,
            icon: wallet.icon,
            injectionKey: wallet.id,
            website: '',
            supportsPsbt: true,
            supportsTaproot: true,
            supportsOrdinals: false,
            mobileSupport: false,
          };

      await connectBrowserWallet(walletInfo);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnectModalOpen && !isVisible) return null;

  const viewTitle: Record<WalletView, string> = {
    'select': 'Connect Wallet',
    'create': 'Create New Wallet',
    'restore': 'Restore Wallet',
    'restore-mnemonic': 'Restore from Mnemonic',
    'restore-json': 'Restore from Keystore',
    'restore-drive-picker': 'Select Backup',
    'restore-drive-unlock': 'Unlock Wallet',
    'browser-extension': 'Browser Wallets',
    'unlock': 'Unlock Wallet',
    'show-mnemonic': 'Recovery Phrase',
  };

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center bg-black/25 backdrop-blur-sm px-4 ${isClosing ? 'animate-[fadeOut_140ms_ease-in_forwards]' : 'animate-[fadeIn_200ms_ease-out]'}`}
      onClick={handleClose}
    >
      <div
        className={`w-[400px] max-w-[92vw] overflow-hidden rounded-3xl ${isClosing ? 'animate-[modalOut_140ms_cubic-bezier(0.4,0,1,1)_forwards]' : 'animate-[modalIn_280ms_cubic-bezier(0,0,0.2,1)]'}`}
        style={{ background: '#1a1a1a', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          {view !== 'select' ? (
            <button
              onClick={() => {
                const backMap: Partial<Record<WalletView, WalletView>> = {
                  'create': 'select',
                  'unlock': 'select',
                  'restore': 'select',
                  'browser-extension': 'select',
                  'show-mnemonic': 'select',
                  'restore-mnemonic': 'restore',
                  'restore-json': 'restore',
                  'restore-drive-picker': 'restore',
                  'restore-drive-unlock': 'restore-drive-picker',
                };
                setView(backMap[view] || 'select');
                resetForm();
              }}
              className="rounded-lg p-1.5 text-[color:var(--sf-muted)] transition-colors hover:bg-white/[0.06] hover:text-[color:var(--sf-text)]"
            >
              <ChevronLeft size={22} />
            </button>
          ) : (
            <div className="w-[30px]" />
          )}
          <span className="text-base font-bold uppercase tracking-wider text-[color:var(--sf-text)]">
            {viewTitle[view]}
          </span>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[color:var(--sf-muted)] transition-colors hover:bg-white/[0.06] hover:text-[color:var(--sf-text)]"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="overflow-hidden"
          style={{
            height: contentHeight === 'auto' ? 'auto' : contentHeight,
            transition: 'height 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
        <div ref={innerRef} className="p-5">
          {view === 'select' && (
            <div className="flex flex-col gap-4">
              {/* Keystore Section */}
              <div>
                <div className="mb-2.5 text-[13px] font-bold uppercase tracking-widest text-[color:var(--sf-muted)]">Keystore</div>
                <div className="space-y-3">
                  {hasExistingKeystore && (
                    <SelectRow
                      icon={<Lock size={18} className="text-blue-400" />}
                      label="Unlock Wallet"
                      onClick={() => setView('unlock')}
                    />
                  )}
                  <SelectRow
                    icon={<Plus size={18} className="text-green-400" />}
                    label="Create Wallet"
                    onClick={() => setView('create')}
                  />
                  <SelectRow
                    icon={<Key size={18} className="text-yellow-400" />}
                    label="Restore Wallet"
                    onClick={() => setView('restore')}
                  />
                </div>
              </div>

              {/* Browser Extension Section */}
              <div>
                <div className="mb-2.5 text-[13px] font-bold uppercase tracking-widest text-[color:var(--sf-muted)]">Browser Extension</div>
                <SelectRow
                  icon={<Download size={18} className="text-purple-400" />}
                  label="Connect Extension"
                  onClick={() => setView('browser-extension')}
                />
              </div>

              {hasExistingKeystore && (
                <button
                  onClick={handleDeleteKeystore}
                  className="mt-1 text-sm font-medium text-red-500/70 transition-colors hover:text-red-400"
                >
                  Delete stored wallet
                </button>
              )}
            </div>
          )}

          {view === 'restore' && (
            <div className="flex flex-col gap-4">
              <div className="space-y-3">
                <SelectRow
                  icon={<Key size={18} className="text-yellow-400" />}
                  label="Recovery Phrase"
                  onClick={() => setView('restore-mnemonic')}
                />
                <SelectRow
                  icon={<Upload size={18} className="text-orange-400" />}
                  label="Keystore File"
                  onClick={() => setView('restore-json')}
                />
                {driveConfigured && (
                  <SelectRow
                    icon={<Cloud size={18} className="text-sky-400" />}
                    label="Google Drive"
                    onClick={handleLoadDriveBackups}
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="flex flex-col gap-4">
              <InputField
                label="Password (min 8 characters)"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Enter password"
                togglePassword={() => setShowPassword(!showPassword)}
                showPassword={showPassword}
              />
              <InputField
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm password"
              />

              {driveConfigured && (
                <InputField
                  label="Password Hint (Optional)"
                  type="text"
                  value={passwordHintInput}
                  onChange={setPasswordHintInput}
                  placeholder="e.g., My cat's name + birth year"
                  helpText="For Google Drive backup. Don't include your actual password."
                />
              )}

              {error && <ErrorMessage message={error} />}

              <PrimaryButton
                onClick={handleCreateWallet}
                disabled={isLoading}
                label={isLoading ? 'Creating...' : 'Create Wallet'}
              />
            </div>
          )}

          {view === 'show-mnemonic' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5 text-sm font-medium text-yellow-400/90">
                Write down these words in order and store them safely. This is the only way to recover your wallet.
              </div>

              <div className="relative rounded-lg border border-[color:var(--sf-outline)] bg-black/30 p-3">
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 font-mono text-sm font-medium">
                  {generatedMnemonic.split(' ').map((word, i) => (
                    <div key={i} className="flex gap-1.5">
                      <span className="text-[color:var(--sf-muted)] tabular-nums w-5 text-right">{i + 1}.</span>
                      <span className="text-[color:var(--sf-text)]">{word}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={copyMnemonic}
                  className="absolute right-2 top-2 rounded p-1 text-[color:var(--sf-muted)] transition-colors hover:bg-white/[0.06] hover:text-[color:var(--sf-text)]"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium text-[color:var(--sf-muted)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mnemonicConfirmed}
                  onChange={(e) => setMnemonicConfirmed(e.target.checked)}
                  className="rounded border-[color:var(--sf-outline)]"
                />
                I have saved my recovery phrase securely
              </label>

              {error && <ErrorMessage message={error} />}

              {driveConfigured ? (
                <div className="flex flex-col gap-2 pt-1">
                  <PrimaryButton
                    onClick={handleBackupToDrive}
                    disabled={isLoading}
                    label={isLoading ? 'Backing up...' : 'Backup to Google Drive'}
                    icon={<Cloud size={14} />}
                  />
                  <button
                    onClick={handleConfirmMnemonic}
                    disabled={!mnemonicConfirmed}
                    className="text-sm font-medium text-[color:var(--sf-muted)] transition-colors hover:text-[color:var(--sf-text)] py-1.5 disabled:opacity-40"
                  >
                    Skip backup
                  </button>
                </div>
              ) : (
                <PrimaryButton
                  onClick={handleConfirmMnemonic}
                  disabled={!mnemonicConfirmed}
                  label="Continue to Wallet"
                />
              )}
            </div>
          )}

          {view === 'restore-mnemonic' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[color:var(--sf-muted)]">Recovery Phrase</label>
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  className="h-24 w-full resize-none rounded-xl border border-[color:var(--sf-outline)] bg-black/30 px-4 py-3 text-base font-mono font-medium text-[color:var(--sf-text)] placeholder:text-[color:var(--sf-muted)]/50 outline-none transition-colors focus:border-white/20"
                  placeholder="Enter your 12 or 24 word recovery phrase"
                />
              </div>

              <InputField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Create a password"
                togglePassword={() => setShowPassword(!showPassword)}
                showPassword={showPassword}
              />

              {error && <ErrorMessage message={error} />}

              <PrimaryButton
                onClick={handleRestoreFromMnemonic}
                disabled={isLoading}
                label={isLoading ? 'Restoring...' : 'Restore Wallet'}
              />
            </div>
          )}

          {view === 'restore-json' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-[color:var(--sf-outline)] bg-black/20 px-3 py-2.5 text-sm font-medium text-[color:var(--sf-muted)]">
                Upload a previously exported JSON keystore file to restore your wallet.
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[color:var(--sf-muted)]">Keystore File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full rounded-lg border border-dashed p-5 text-center transition-colors ${
                    uploadedKeystore
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-[color:var(--sf-outline)] hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  {uploadedKeystore ? (
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-400">
                      <Check size={16} />
                      <span>Keystore file loaded</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-[color:var(--sf-muted)]">
                      <Upload size={20} />
                      <span className="text-sm font-medium">Click to upload keystore JSON</span>
                    </div>
                  )}
                </button>
              </div>

              <InputField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Enter keystore password"
                togglePassword={() => setShowPassword(!showPassword)}
                showPassword={showPassword}
                onKeyDown={(e) => e.key === 'Enter' && handleRestoreFromJson()}
              />

              {error && <ErrorMessage message={error} />}

              <PrimaryButton
                onClick={handleRestoreFromJson}
                disabled={isLoading || !uploadedKeystore}
                label={isLoading ? 'Restoring...' : 'Restore Wallet'}
              />
            </div>
          )}

          {view === 'browser-extension' && (
            <div className="flex flex-col gap-4">
              {installedWallets.length > 0 ? (
                <div className="max-h-72 overflow-y-auto space-y-3">
                  {installedWallets.map((wallet) => {
                    const fullInfo = BROWSER_WALLETS.find((w: BrowserWalletInfo) => w.id === wallet.id);
                    return (
                      <button
                        key={wallet.id}
                        onClick={() => handleConnectBrowserWallet(wallet)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-between rounded-2xl bg-[#232323] px-5 py-4 transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
                      >
                        <div className="text-base font-semibold text-[color:var(--sf-text)]">{wallet.name}</div>
                        <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 rounded-lg" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-base font-medium text-[color:var(--sf-muted)] mb-4">No browser wallets detected</div>
                  <div className="text-[13px] font-bold uppercase tracking-widest text-[color:var(--sf-muted)] mb-3">Install a wallet</div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {allWallets.filter(w => !w.installed).slice(0, 5).map((wallet) => {
                      const fullInfo = BROWSER_WALLETS.find((w: BrowserWalletInfo) => w.id === wallet.id);
                      return (
                        <a
                          key={wallet.id}
                          href={fullInfo?.website || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-2xl bg-[#232323] px-4 py-3.5 hover:bg-[#2a2a2a] transition-colors"
                        >
                          <span className="text-base font-medium text-[color:var(--sf-text)]">{wallet.name}</span>
                          <img src={wallet.icon} alt={wallet.name} className="w-7 h-7 rounded-lg" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && <ErrorMessage message={error} />}
            </div>
          )}

          {view === 'restore-drive-picker' && (
            <div className="flex flex-col gap-4">
              {driveBackups.length > 0 ? (
                <>
                  <div className="text-sm font-medium text-[color:var(--sf-muted)] mb-1">
                    Select a wallet backup to restore:
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-3">
                    {driveBackups.map((backup) => (
                      <button
                        key={backup.folderId}
                        onClick={() => handleSelectDriveWallet(backup)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-between rounded-2xl bg-[#232323] px-5 py-4 transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3.5">
                          <Cloud size={18} className="text-[color:var(--sf-muted)]" />
                          <div className="text-left">
                            <div className="text-base font-semibold text-[color:var(--sf-text)]">{backup.walletLabel}</div>
                            <div className="text-xs text-[color:var(--sf-muted)] font-mono">
                              {new Date(backup.timestamp).toLocaleDateString()}
                              {backup.hasPasswordHint && ' — Has password hint'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-[color:var(--sf-muted)]" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-base font-medium text-[color:var(--sf-muted)]">
                  No wallet backups found in your Google Drive
                </div>
              )}

              {error && <ErrorMessage message={error} />}
            </div>
          )}

          {view === 'restore-drive-unlock' && selectedDriveWallet && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-[color:var(--sf-outline)] bg-black/20 p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Cloud size={16} className="text-[color:var(--sf-muted)]" />
                  <div className="text-base font-semibold text-[color:var(--sf-text)]">
                    {selectedDriveWallet.walletLabel}
                  </div>
                </div>
                {passwordHint && (
                  <div className="text-xs text-[color:var(--sf-muted)] mt-1 font-mono">
                    Hint: {passwordHint}
                  </div>
                )}
              </div>

              <InputField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Enter wallet password"
                togglePassword={() => setShowPassword(!showPassword)}
                showPassword={showPassword}
                onKeyDown={(e) => e.key === 'Enter' && handleRestoreFromDrive()}
              />

              {error && <ErrorMessage message={error} />}

              <PrimaryButton
                onClick={handleRestoreFromDrive}
                disabled={isLoading || !password}
                label={isLoading ? 'Unlocking...' : 'Unlock Wallet'}
              />
            </div>
          )}

          {view === 'unlock' && (
            <div className="flex flex-col gap-4">
              <InputField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                togglePassword={() => setShowPassword(!showPassword)}
                showPassword={showPassword}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockKeystore()}
                autoFocus
              />

              {error && <ErrorMessage message={error} />}

              <PrimaryButton
                onClick={handleUnlockKeystore}
                disabled={isLoading}
                label={isLoading ? 'Unlocking...' : 'Unlock'}
              />
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function SelectRow({ icon, label, onClick, disabled }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between rounded-2xl bg-[#232323] px-5 py-4 transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
    >
      <div className="text-base font-semibold text-[color:var(--sf-text)]">{label}</div>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
        {icon}
      </div>
    </button>
  );
}

function InputField({ label, type, value, onChange, placeholder, togglePassword, showPassword, helpText, onKeyDown, autoFocus }: {
  label: string;
  type: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  togglePassword?: () => void;
  showPassword?: boolean;
  helpText?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-widest text-[color:var(--sf-muted)]">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          className={`w-full rounded-xl border border-[color:var(--sf-outline)] bg-black/30 px-4 py-3 text-base font-medium text-[color:var(--sf-text)] placeholder:text-[color:var(--sf-muted)]/50 outline-none transition-colors focus:border-white/20 ${togglePassword ? 'pr-10' : ''}`}
          placeholder={placeholder}
        />
        {togglePassword && (
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--sf-muted)] transition-colors hover:text-[color:var(--sf-text)]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {helpText && <div className="mt-1.5 text-[13px] text-[color:var(--sf-muted)]">{helpText}</div>}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm font-medium text-red-400">
      {message}
    </div>
  );
}

function PrimaryButton({ onClick, disabled, label, icon }: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-base font-medium text-black transition-all hover:bg-white/90 disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}

