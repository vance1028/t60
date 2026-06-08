import React, { useState } from 'react';
import './UnlockScreen.css';

interface UnlockScreenProps {
  mode: 'setup' | 'unlock';
  onSubmit: (masterPassword: string) => void;
  error: string;
}

const UnlockScreen: React.FC<UnlockScreenProps> = ({ mode, onSubmit, error }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!password) {
      setLocalError('请输入主密码');
      return;
    }

    if (mode === 'setup') {
      if (password.length < 8) {
        setLocalError('主密码至少需要8个字符');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('两次输入的密码不一致');
        return;
      }
    }

    onSubmit(password);
  };

  const displayError = localError || error;

  return (
    <div className="unlock-container">
      <div className="unlock-card">
        <div className="unlock-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="unlock-title">VaultKeeper</h1>
        <p className="unlock-subtitle">
          {mode === 'setup' ? '设置主密码以保护你的密码库' : '输入主密码解锁密码库'}
        </p>

        <form onSubmit={handleSubmit} className="unlock-form">
          <div className="unlock-field">
            <label className="unlock-label">主密码</label>
            <div className="unlock-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="unlock-input"
                placeholder={mode === 'setup' ? '设置主密码（至少8位）' : '输入主密码'}
                autoFocus
              />
              <button
                type="button"
                className="unlock-toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          {mode === 'setup' && (
            <div className="unlock-field">
              <label className="unlock-label">确认主密码</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="unlock-input"
                placeholder="再次输入主密码"
              />
            </div>
          )}

          {displayError && <div className="unlock-error">{displayError}</div>}

          <button type="submit" className="unlock-submit">
            {mode === 'setup' ? '创建密码库' : '解锁'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UnlockScreen;
