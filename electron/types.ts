export interface VaultEntry {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface VaultData {
  entries: VaultEntry[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedVault {
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  version: number;
}

export interface AppSettings {
  autoLockMinutes: number;
  clipboardClearSeconds: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
};
