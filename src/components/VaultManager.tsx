import React, { useState, useMemo, useCallback } from 'react';
import { VaultData, VaultEntry, AppSettings } from '../types';
import EntryList from './EntryList';
import EntryForm from './EntryForm';
import PasswordGenerator from './PasswordGenerator';
import SettingsPanel from './SettingsPanel';
import ChangeMasterPassword from './ChangeMasterPassword';
import { useClipboard } from '../hooks/useClipboard';
import { v4 as uuidv4 } from 'uuid';
import './VaultManager.css';

interface VaultManagerProps {
  vaultData: VaultData;
  onSave: (data: VaultData) => Promise<{ success: boolean; error?: string }>;
  onLock: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

type ViewMode = 'list' | 'form' | 'generator' | 'settings' | 'change-password';

const VaultManager: React.FC<VaultManagerProps> = ({
  vaultData,
  onSave,
  onLock,
  settings,
  onSettingsChange,
}) => {
  const [view, setView] = useState<ViewMode>('list');
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const copyToClipboard = useClipboard(settings.clipboardClearSeconds);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    vaultData.entries.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [vaultData.entries]);

  const filteredEntries = useMemo(() => {
    let entries = vaultData.entries;

    if (selectedCategory !== 'all') {
      entries = entries.filter((e) => e.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          e.url.toLowerCase().includes(q)
      );
    }

    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [vaultData.entries, searchQuery, selectedCategory]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleSaveEntry = useCallback(async (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = Date.now();
    let updatedEntries: VaultEntry[];

    if (entry.id) {
      updatedEntries = vaultData.entries.map((e) =>
        e.id === entry.id ? { ...entry, updatedAt: now } as VaultEntry : e
      );
    } else {
      const newEntry: VaultEntry = {
        ...entry,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };
      updatedEntries = [...vaultData.entries, newEntry];
    }

    const updatedData: VaultData = {
      ...vaultData,
      entries: updatedEntries,
      updatedAt: now,
    };

    const result = await onSave(updatedData);
    if (result.success) {
      showNotification(entry.id ? '条目已更新' : '条目已创建');
      setView('list');
      setEditingEntry(null);
    } else {
      showNotification(result.error || '保存失败', 'error');
    }
  }, [vaultData, onSave, showNotification]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    const updatedEntries = vaultData.entries.filter((e) => e.id !== id);
    const updatedData: VaultData = {
      ...vaultData,
      entries: updatedEntries,
      updatedAt: Date.now(),
    };
    const result = await onSave(updatedData);
    if (result.success) {
      showNotification('条目已删除');
    } else {
      showNotification(result.error || '删除失败', 'error');
    }
  }, [vaultData, onSave, showNotification]);

  const handleCopyField = useCallback(async (text: string, fieldName: string) => {
    await copyToClipboard(text);
    showNotification(`${fieldName}已复制到剪贴板（${settings.clipboardClearSeconds}秒后自动清除）`);
  }, [copyToClipboard, settings.clipboardClearSeconds, showNotification]);

  const handleExportBackup = useCallback(async () => {
    const result = await window.vaultAPI.vaultExportBackup();
    if (result.success && !result.canceled) {
      showNotification('备份已导出');
    } else if (!result.canceled && result.error) {
      showNotification(result.error, 'error');
    }
  }, [showNotification]);

  const handleImportBackup = useCallback(async (masterPassword: string) => {
    const result = await window.vaultAPI.vaultImportBackup(masterPassword);
    if (result.success && result.data && !result.canceled) {
      await onSave(result.data);
      showNotification('备份已恢复');
      setView('list');
    } else if (!result.canceled && result.error) {
      showNotification(result.error, 'error');
    }
  }, [onSave, showNotification]);

  return (
    <div className="vault-manager">
      <header className="vault-header">
        <div className="vault-header-left">
          <h1 className="vault-logo">VaultKeeper</h1>
        </div>
        <div className="vault-header-right">
          <button className="header-btn" onClick={() => setView('generator')} title="密码生成器">
            密码生成器
          </button>
          <button className="header-btn" onClick={() => setView('settings')} title="设置">
            设置
          </button>
          <button className="header-btn lock-btn" onClick={onLock} title="锁定密码库">
            锁定
          </button>
        </div>
      </header>

      {view === 'list' && (
        <div className="vault-content">
          <div className="vault-toolbar">
            <div className="vault-search">
              <input
                type="text"
                placeholder="搜索名称、用户名、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="add-entry-btn" onClick={() => { setEditingEntry(null); setView('form'); }}>
              + 添加条目
            </button>
          </div>

          <div className="vault-categories">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? '全部' : cat}
              </button>
            ))}
          </div>

          <EntryList
            entries={filteredEntries}
            onEdit={(entry) => { setEditingEntry(entry); setView('form'); }}
            onDelete={handleDeleteEntry}
            onCopyField={handleCopyField}
          />
        </div>
      )}

      {view === 'form' && (
        <EntryForm
          entry={editingEntry}
          onSave={handleSaveEntry}
          onCancel={() => { setView('list'); setEditingEntry(null); }}
          onUsePassword={(password) => {}}
          existingCategories={categories.filter((c) => c !== 'all')}
        />
      )}

      {view === 'generator' && (
        <PasswordGenerator
          onUsePassword={(password) => {
            if (editingEntry) {
              setView('form');
            } else {
              setView('form');
            }
          }}
          onBack={() => setView('list')}
          onCopy={handleCopyField}
        />
      )}

      {view === 'settings' && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={onSettingsChange}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onChangeMasterPassword={() => setView('change-password')}
          onBack={() => setView('list')}
        />
      )}

      {view === 'change-password' && (
        <ChangeMasterPassword
          onBack={() => setView('settings')}
          onSuccess={() => {
            showNotification('主密码已更改');
            setView('settings');
          }}
        />
      )}

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default VaultManager;
