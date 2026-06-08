import { VaultData, VaultEntry, AppSettings } from './types';

export interface VaultAPI {
  vaultExists: () => Promise<boolean>;
  vaultCreate: (masterPassword: string) => Promise<{ success: boolean; data?: VaultData; error?: string }>;
  vaultUnlock: (masterPassword: string) => Promise<{ success: boolean; data?: VaultData; error?: string }>;
  vaultLock: () => Promise<{ success: boolean }>;
  vaultSave: (vaultData: VaultData) => Promise<{ success: boolean; error?: string }>;
  vaultChangeMasterPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  vaultExportBackup: () => Promise<{ success: boolean; canceled?: boolean; error?: string }>;
  vaultImportBackup: (masterPassword: string) => Promise<{ success: boolean; data?: VaultData; canceled?: boolean; error?: string }>;
  settingsLoad: () => Promise<AppSettings>;
  settingsSave: (settings: AppSettings) => Promise<{ success: boolean }>;
  activityPing: () => Promise<boolean>;
  clipboardWrite: (text: string) => Promise<boolean>;
  clipboardClear: () => Promise<boolean>;
  onVaultLocked: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    vaultAPI: VaultAPI;
  }
}
