import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('vaultAPI', {
  vaultExists: () => ipcRenderer.invoke('vault-exists'),
  vaultCreate: (masterPassword: string) => ipcRenderer.invoke('vault-create', masterPassword),
  vaultUnlock: (masterPassword: string) => ipcRenderer.invoke('vault-unlock', masterPassword),
  vaultLock: () => ipcRenderer.invoke('vault-lock'),
  vaultSave: (vaultData: any) => ipcRenderer.invoke('vault-save', vaultData),
  vaultChangeMasterPassword: (currentPassword: string, newPassword: string) =>
    ipcRenderer.invoke('vault-change-master-password', currentPassword, newPassword),
  vaultExportBackup: () => ipcRenderer.invoke('vault-export-backup'),
  vaultImportBackup: (masterPassword: string) => ipcRenderer.invoke('vault-import-backup', masterPassword),
  settingsLoad: () => ipcRenderer.invoke('settings-load'),
  settingsSave: (settings: any) => ipcRenderer.invoke('settings-save', settings),
  activityPing: () => ipcRenderer.invoke('activity-ping'),
  clipboardWrite: (text: string) => ipcRenderer.invoke('clipboard-write', text),
  clipboardClear: () => ipcRenderer.invoke('clipboard-clear'),
  onVaultLocked: (callback: () => void) => {
    ipcRenderer.on('vault-locked', callback);
    return () => ipcRenderer.removeListener('vault-locked', callback);
  },
});
