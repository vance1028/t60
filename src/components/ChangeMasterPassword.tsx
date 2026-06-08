import React, { useState } from 'react';
import './ChangeMasterPassword.css';

interface ChangeMasterPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
}

const ChangeMasterPassword: React.FC<ChangeMasterPasswordProps> = ({ onBack, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword.length < 8) {
      setError('新主密码至少需要8个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (currentPassword === newPassword) {
      setError('新密码不能与当前密码相同');
      return;
    }

    setLoading(true);
    try {
      const result = await window.vaultAPI.vaultChangeMasterPassword(currentPassword, newPassword);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || '更改失败');
      }
    } catch (err: any) {
      setError(err.message || '发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-pw-container">
      <div className="change-pw-header">
        <h2 className="change-pw-title">更改主密码</h2>
        <button className="back-btn" onClick={onBack}>返回</button>
      </div>

      <div className="change-pw-warning">
        更改主密码后，所有旧备份文件将使用旧密码打开。请牢记新密码，丢失后将无法恢复密码库。
      </div>

      <form onSubmit={handleSubmit} className="change-pw-form">
        <div className="change-pw-field">
          <label className="change-pw-label">当前主密码</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="change-pw-input"
            autoFocus
          />
        </div>

        <div className="change-pw-field">
          <label className="change-pw-label">新主密码</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="change-pw-input"
            placeholder="至少8位"
          />
        </div>

        <div className="change-pw-field">
          <label className="change-pw-label">确认新主密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="change-pw-input"
          />
        </div>

        {error && <div className="change-pw-error">{error}</div>}

        <button type="submit" className="change-pw-submit" disabled={loading}>
          {loading ? '处理中...' : '更改主密码'}
        </button>
      </form>
    </div>
  );
};

export default ChangeMasterPassword;
