import React, { useState } from 'react';
import { AppSettings } from '../types';
import './SettingsPanel.css';

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (masterPassword: string) => void;
  onChangeMasterPassword: () => void;
  onBack: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onExportBackup,
  onImportBackup,
  onChangeMasterPassword,
  onBack,
}) => {
  const [autoLockMinutes, setAutoLockMinutes] = useState(settings.autoLockMinutes);
  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(settings.clipboardClearSeconds);
  const [importPassword, setImportPassword] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = () => {
    onSettingsChange({
      autoLockMinutes,
      clipboardClearSeconds,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImport = () => {
    if (!importPassword) return;
    onImportBackup(importPassword);
    setImportPassword('');
    setShowImportDialog(false);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2 className="settings-title">设置</h2>
        <button className="back-btn" onClick={onBack}>返回</button>
      </div>

      <div className="settings-section">
        <h3 className="section-title">安全</h3>

        <div className="setting-item">
          <label className="setting-label">自动锁定时间（分钟）</label>
          <input
            type="number"
            min={1}
            max={60}
            value={autoLockMinutes}
            onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
            className="setting-input"
          />
          <span className="setting-hint">空闲超过此时间后自动锁定密码库</span>
        </div>

        <div className="setting-item">
          <label className="setting-label">剪贴板自动清除时间（秒）</label>
          <input
            type="number"
            min={5}
            max={120}
            value={clipboardClearSeconds}
            onChange={(e) => setClipboardClearSeconds(Number(e.target.value))}
            className="setting-input"
          />
          <span className="setting-hint">复制密码后自动清除剪贴板的时间</span>
        </div>

        <button className="setting-save-btn" onClick={handleSaveSettings}>
          {saved ? '已保存 ✓' : '保存设置'}
        </button>
      </div>

      <div className="settings-section">
        <h3 className="section-title">密码库管理</h3>

        <div className="setting-actions">
          <button className="setting-action-btn" onClick={onChangeMasterPassword}>
            更改主密码
          </button>
          <button className="setting-action-btn" onClick={onExportBackup}>
            导出加密备份
          </button>
          <button className="setting-action-btn" onClick={() => setShowImportDialog(true)}>
            从备份恢复
          </button>
        </div>
      </div>

      {showImportDialog && (
        <div className="modal-overlay" onClick={() => setShowImportDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">从备份恢复</h3>
            <p className="modal-hint">请输入备份文件的主密码</p>
            <input
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              className="setting-input"
              placeholder="备份文件的主密码"
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowImportDialog(false)}>
                取消
              </button>
              <button className="modal-btn confirm" onClick={handleImport} disabled={!importPassword}>
                恢复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
