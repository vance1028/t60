import React, { useState, useEffect, useCallback } from 'react';
import { VaultData, AppSettings, DEFAULT_SETTINGS } from './types';
import UnlockScreen from './components/UnlockScreen';
import VaultManager from './components/VaultManager';
import { useAutoLock } from './hooks/useAutoLock';

type AppScreen = 'loading' | 'setup' | 'unlock' | 'vault';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const loadedSettings = await window.vaultAPI.settingsLoad();
        setSettings(loadedSettings);
      } catch {}
      try {
        const exists = await window.vaultAPI.vaultExists();
        setScreen(exists ? 'unlock' : 'setup');
      } catch {
        setScreen('setup');
      }
    })();
  }, []);

  useEffect(() => {
    const cleanup = window.vaultAPI.onVaultLocked(() => {
      setVaultData(null);
      setScreen('unlock');
    });
    return cleanup;
  }, []);

  useAutoLock(settings.autoLockMinutes);

  const handleCreate = useCallback(async (masterPassword: string) => {
    setError('');
    const result = await window.vaultAPI.vaultCreate(masterPassword);
    if (result.success && result.data) {
      setVaultData(result.data);
      setScreen('vault');
    } else {
      setError(result.error || '创建失败');
    }
  }, []);

  const handleUnlock = useCallback(async (masterPassword: string) => {
    setError('');
    const result = await window.vaultAPI.vaultUnlock(masterPassword);
    if (result.success && result.data) {
      setVaultData(result.data);
      setScreen('vault');
    } else {
      setError(result.error || '解锁失败');
    }
  }, []);

  const handleLock = useCallback(async () => {
    await window.vaultAPI.vaultLock();
    setVaultData(null);
    setScreen('unlock');
  }, []);

  const handleSave = useCallback(async (data: VaultData) => {
    const result = await window.vaultAPI.vaultSave(data);
    if (result.success) {
      setVaultData(data);
    }
    return result;
  }, []);

  const handleSettingsChange = useCallback(async (newSettings: AppSettings) => {
    await window.vaultAPI.settingsSave(newSettings);
    setSettings(newSettings);
  }, []);

  if (screen === 'loading') {
    return <LoadingScreen />;
  }

  if (screen === 'setup') {
    return (
      <UnlockScreen
        mode="setup"
        onSubmit={handleCreate}
        error={error}
      />
    );
  }

  if (screen === 'unlock') {
    return (
      <UnlockScreen
        mode="unlock"
        onSubmit={handleUnlock}
        error={error}
      />
    );
  }

  if (screen === 'vault' && vaultData) {
    return (
      <VaultManager
        vaultData={vaultData}
        onSave={handleSave}
        onLock={handleLock}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    );
  }

  return null;
};

const LoadingScreen: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    fontSize: 18,
  }}>
    加载中...
  </div>
);

export default App;
