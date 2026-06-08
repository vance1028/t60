import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, dialog, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {
  generateSalt,
  deriveKey,
  encrypt,
  decrypt,
  bufferToBase64,
  base64ToBuffer,
  secureClear,
} from './crypto';
import { EncryptedVault, VaultData, VaultEntry, DEFAULT_SETTINGS, AppSettings } from './types';

const VAULT_VERSION = 1;

function getVaultFilePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'vaultkeeper.vault');
}

function getSettingsFilePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let derivedKey: Buffer | null = null;
let currentSalt: Buffer | null = null;
let autoLockTimer: ReturnType<typeof setTimeout> | null = null;
let currentAutoLockMinutes: number = DEFAULT_SETTINGS.autoLockMinutes;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: getIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });
}

function getIcon(): Electron.NativeImage {
  return nativeImage.createEmpty();
}

function setupTray(): void {
  tray = new Tray(getIcon());
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示 VaultKeeper', click: () => showWindow() },
    { label: '锁定', click: () => lockVault() },
    { type: 'separator' },
    { label: '退出', click: () => quitApp() },
  ]);
  tray.setToolTip('VaultKeeper');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => showWindow());
}

function showWindow(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function lockVault(): void {
  if (derivedKey) {
    secureClear(derivedKey);
    derivedKey = null;
  }
  if (currentSalt) {
    secureClear(currentSalt);
    currentSalt = null;
  }
  mainWindow?.webContents.send('vault-locked');
}

function quitApp(): void {
  if (derivedKey) {
    secureClear(derivedKey);
    derivedKey = null;
  }
  if (currentSalt) {
    secureClear(currentSalt);
    currentSalt = null;
  }
  globalShortcut.unregisterAll();
  tray?.destroy();
  tray = null;
  mainWindow?.removeAllListeners('close');
  mainWindow?.close();
  mainWindow = null;
  app.quit();
}

function resetAutoLockTimer(): void {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
  }
  if (derivedKey && currentAutoLockMinutes > 0) {
    autoLockTimer = setTimeout(() => {
      lockVault();
    }, currentAutoLockMinutes * 60 * 1000);
  }
}

function loadSettings(): AppSettings {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AppSettings): void {
  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
}

function vaultFileExists(): boolean {
  return fs.existsSync(getVaultFilePath());
}

function readEncryptedVault(): EncryptedVault | null {
  try {
    const filePath = getVaultFilePath();
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as EncryptedVault;
  } catch {
    return null;
  }
}

function writeEncryptedVault(vault: EncryptedVault): void {
  const filePath = getVaultFilePath();
  fs.writeFileSync(filePath, JSON.stringify(vault), 'utf8');
}

function createEmptyVaultData(): VaultData {
  return {
    entries: [],
    version: VAULT_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function encryptVaultData(vaultData: VaultData, key: Buffer, salt: Buffer): EncryptedVault {
  const { iv, authTag, ciphertext } = encrypt(JSON.stringify(vaultData), key);
  return {
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    authTag: bufferToBase64(authTag),
    ciphertext: bufferToBase64(ciphertext),
    version: VAULT_VERSION,
  };
}

function decryptVaultData(encrypted: EncryptedVault, key: Buffer): VaultData {
  const iv = base64ToBuffer(encrypted.iv);
  const authTag = base64ToBuffer(encrypted.authTag);
  const ciphertext = base64ToBuffer(encrypted.ciphertext);
  const json = decrypt(ciphertext, key, iv, authTag);
  return JSON.parse(json) as VaultData;
}

function registerIpcHandlers(): void {
  ipcMain.handle('vault-exists', () => {
    return vaultFileExists();
  });

  ipcMain.handle('vault-create', (_event, masterPassword: string) => {
    try {
      currentSalt = generateSalt();
      derivedKey = deriveKey(masterPassword, currentSalt);
      const vaultData = createEmptyVaultData();
      const encrypted = encryptVaultData(vaultData, derivedKey, currentSalt);
      writeEncryptedVault(encrypted);
      resetAutoLockTimer();
      return { success: true, data: vaultData };
    } catch (err: any) {
      if (derivedKey) {
        secureClear(derivedKey);
        derivedKey = null;
      }
      if (currentSalt) {
        secureClear(currentSalt);
        currentSalt = null;
      }
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('vault-unlock', (_event, masterPassword: string) => {
    try {
      const encrypted = readEncryptedVault();
      if (!encrypted) {
        return { success: false, error: '密码库文件不存在' };
      }
      currentSalt = base64ToBuffer(encrypted.salt);
      derivedKey = deriveKey(masterPassword, currentSalt);
      try {
        const vaultData = decryptVaultData(encrypted, derivedKey);
        resetAutoLockTimer();
        return { success: true, data: vaultData };
      } catch {
        if (derivedKey) {
          secureClear(derivedKey);
          derivedKey = null;
        }
        if (currentSalt) {
          secureClear(currentSalt);
          currentSalt = null;
        }
        return { success: false, error: '主密码错误' };
      }
    } catch (err: any) {
      if (derivedKey) {
        secureClear(derivedKey);
        derivedKey = null;
      }
      if (currentSalt) {
        secureClear(currentSalt);
        currentSalt = null;
      }
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('vault-lock', () => {
    lockVault();
    return { success: true };
  });

  ipcMain.handle('vault-save', (_event, vaultData: VaultData) => {
    try {
      if (!derivedKey || !currentSalt) {
        return { success: false, error: '密码库未解锁' };
      }
      const encrypted = encryptVaultData(vaultData, derivedKey, currentSalt);
      writeEncryptedVault(encrypted);
      resetAutoLockTimer();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('vault-change-master-password', (_event, currentPassword: string, newPassword: string) => {
    try {
      if (!derivedKey || !currentSalt) {
        return { success: false, error: '密码库未解锁' };
      }
      const encrypted = readEncryptedVault();
      if (!encrypted) {
        return { success: false, error: '密码库文件不存在' };
      }
      const verifySalt = base64ToBuffer(encrypted.salt);
      const verifyKey = deriveKey(currentPassword, verifySalt);
      secureClear(verifySalt);
      let vaultData: VaultData;
      try {
        vaultData = decryptVaultData(encrypted, verifyKey);
      } catch {
        secureClear(verifyKey);
        return { success: false, error: '当前主密码错误' };
      }
      secureClear(verifyKey);
      const newSalt = generateSalt();
      const newKey = deriveKey(newPassword, newSalt);
      const updatedData = { ...vaultData, updatedAt: Date.now() };
      const newEncrypted = encryptVaultData(updatedData, newKey, newSalt);
      writeEncryptedVault(newEncrypted);
      secureClear(derivedKey);
      if (currentSalt) {
        secureClear(currentSalt);
      }
      derivedKey = newKey;
      currentSalt = newSalt;
      resetAutoLockTimer();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('vault-export-backup', async (_event) => {
    try {
      if (!derivedKey) {
        return { success: false, error: '密码库未解锁' };
      }
      const encrypted = readEncryptedVault();
      if (!encrypted) {
        return { success: false, error: '密码库文件不存在' };
      }
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: '导出加密备份',
        defaultPath: `vaultkeeper-backup-${new Date().toISOString().slice(0, 10)}.vault`,
        filters: [{ name: 'VaultKeeper 备份', extensions: ['vault'] }],
      });
      if (result.canceled || !result.filePath) {
        return { success: true, canceled: true };
      }
      fs.writeFileSync(result.filePath, JSON.stringify(encrypted), 'utf8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('vault-import-backup', async (_event, masterPassword: string) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        title: '从备份恢复',
        filters: [{ name: 'VaultKeeper 备份', extensions: ['vault'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, canceled: true };
      }
      const backupData = fs.readFileSync(result.filePaths[0], 'utf8');
      const encrypted = JSON.parse(backupData) as EncryptedVault;
      const backupSalt = base64ToBuffer(encrypted.salt);
      const key = deriveKey(masterPassword, backupSalt);
      let vaultData: VaultData;
      try {
        vaultData = decryptVaultData(encrypted, key);
      } catch {
        secureClear(key);
        secureClear(backupSalt);
        return { success: false, error: '备份文件密码错误' };
      }
      const newSalt = generateSalt();
      const newKey = deriveKey(masterPassword, newSalt);
      const newEncrypted = encryptVaultData(vaultData, newKey, newSalt);
      writeEncryptedVault(newEncrypted);
      if (derivedKey) {
        secureClear(derivedKey);
      }
      if (currentSalt) {
        secureClear(currentSalt);
      }
      derivedKey = newKey;
      currentSalt = newSalt;
      resetAutoLockTimer();
      return { success: true, data: vaultData };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings-load', () => {
    const settings = loadSettings();
    currentAutoLockMinutes = settings.autoLockMinutes;
    return settings;
  });

  ipcMain.handle('settings-save', (_event, settings: AppSettings) => {
    currentAutoLockMinutes = settings.autoLockMinutes;
    saveSettings(settings);
    resetAutoLockTimer();
    return { success: true };
  });

  ipcMain.handle('activity-ping', () => {
    resetAutoLockTimer();
    return true;
  });

  ipcMain.handle('clipboard-write', (_event, text: string) => {
    const { clipboard } = require('electron');
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('clipboard-clear', () => {
    const { clipboard } = require('electron');
    clipboard.clear();
    return true;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupTray();
  registerIpcHandlers();

  globalShortcut.register('Ctrl+Shift+V', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      showWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    quitApp();
  }
});

app.on('before-quit', () => {
  if (derivedKey) {
    secureClear(derivedKey);
    derivedKey = null;
  }
  if (currentSalt) {
    secureClear(currentSalt);
    currentSalt = null;
  }
  globalShortcut.unregisterAll();
});
