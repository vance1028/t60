import React, { useState } from 'react';
import { VaultEntry } from '../types';
import { parseOtpauthUri } from '../utils/totp';
import PasswordGenerator from './PasswordGenerator';
import './EntryForm.css';

interface EntryFormProps {
  entry: VaultEntry | null;
  onSave: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onCancel: () => void;
  onUsePassword: (password: string) => void;
  existingCategories: string[];
}

const EntryForm: React.FC<EntryFormProps> = ({ entry, onSave, onCancel, existingCategories }) => {
  const [name, setName] = useState(entry?.name || '');
  const [url, setUrl] = useState(entry?.url || '');
  const [username, setUsername] = useState(entry?.username || '');
  const [password, setPassword] = useState(entry?.password || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [category, setCategory] = useState(entry?.category || '');
  const [tagsInput, setTagsInput] = useState(entry?.tags.join(', ') || '');
  const [showGenerator, setShowGenerator] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [totpSecret, setTotpSecret] = useState(entry?.totpSecret || '');
  const [totpPeriod, setTotpPeriod] = useState(entry?.totpPeriod || 30);
  const [totpDigits, setTotpDigits] = useState(entry?.totpDigits || 6);
  const [showTotpSection, setShowTotpSection] = useState(!!entry?.totpSecret);
  const [totpUriInput, setTotpUriInput] = useState('');

  const handleOtpauthPaste = () => {
    if (!totpUriInput.trim()) return;
    const parsed = parseOtpauthUri(totpUriInput.trim());
    if (parsed) {
      setTotpSecret(parsed.secret);
      setTotpPeriod(parsed.period);
      setTotpDigits(parsed.digits);
      setShowTotpSection(true);
      setTotpUriInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({
      id: entry?.id,
      name: name.trim(),
      url: url.trim(),
      username: username.trim(),
      password,
      notes: notes.trim(),
      category: category.trim(),
      tags,
      totpSecret: showTotpSection && totpSecret ? totpSecret : undefined,
      totpPeriod: showTotpSection && totpSecret ? totpPeriod : undefined,
      totpDigits: showTotpSection && totpSecret ? totpDigits : undefined,
    });
  };

  const handleGeneratedPassword = (pwd: string) => {
    setPassword(pwd);
    setShowGenerator(false);
  };

  if (showGenerator) {
    return (
      <div className="entry-form-container">
        <h2 className="form-title">生成密码</h2>
        <p className="form-subtitle">生成的密码将填入当前条目的密码字段</p>
        <PasswordGenerator
          onUsePassword={handleGeneratedPassword}
          onBack={() => setShowGenerator(false)}
          onCopy={() => {}}
          embedded
        />
      </div>
    );
  }

  return (
    <div className="entry-form-container">
      <h2 className="form-title">{entry ? '编辑条目' : '添加条目'}</h2>

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-group">
          <label className="form-label">名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="例如：GitHub"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">网址</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="form-input"
            placeholder="https://github.com"
          />
        </div>

        <div className="form-group">
          <label className="form-label">用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            placeholder="用户名或邮箱"
          />
        </div>

        <div className="form-group">
          <label className="form-label">密码</label>
          <div className="password-input-row">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input password-input"
              placeholder="密码"
            />
            <button
              type="button"
              className="form-btn-small"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
            <button
              type="button"
              className="form-btn-small generate-btn"
              onClick={() => setShowGenerator(true)}
            >
              生成
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-textarea"
            placeholder="附加备注..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">分类</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-input"
            placeholder="例如：工作、社交、金融"
            list="category-list"
          />
          <datalist id="category-list">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label className="form-label">标签（逗号分隔）</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="form-input"
            placeholder="开发, 重要, 备用"
          />
        </div>

        <div className="form-divider" />
        <div className="form-group">
          <div className="totp-header-row">
            <label className="form-label">两步验证 (TOTP)</label>
            <button
              type="button"
              className="form-btn-small"
              onClick={() => {
                setShowTotpSection(!showTotpSection);
                if (showTotpSection) {
                  setTotpSecret('');
                  setTotpPeriod(30);
                  setTotpDigits(6);
                }
              }}
            >
              {showTotpSection ? '移除 TOTP' : '+ 添加'}
            </button>
          </div>

          {!showTotpSection && (
            <div className="totp-uri-input-section">
              <input
                type="text"
                value={totpUriInput}
                onChange={(e) => setTotpUriInput(e.target.value)}
                className="form-input"
                placeholder="粘贴 otpauth://totp/... 链接"
              />
              <button
                type="button"
                className="form-btn-small generate-btn"
                onClick={handleOtpauthPaste}
                disabled={!totpUriInput.trim()}
              >
                解析导入
              </button>
            </div>
          )}

          {showTotpSection && (
            <div className="totp-fields">
              <div className="form-group">
                <label className="form-label">密钥 (Base32)</label>
                <input
                  type="text"
                  value={totpSecret}
                  onChange={(e) => setTotpSecret(e.target.value.toUpperCase())}
                  className="form-input"
                  placeholder="例如：JBSWY3DPEHPK3PXP"
                />
              </div>
              <div className="totp-params-row">
                <div className="form-group totp-param">
                  <label className="form-label">周期（秒）</label>
                  <input
                    type="number"
                    value={totpPeriod}
                    onChange={(e) => setTotpPeriod(Number(e.target.value) || 30)}
                    className="form-input"
                    min={1}
                  />
                </div>
                <div className="form-group totp-param">
                  <label className="form-label">位数</label>
                  <input
                    type="number"
                    value={totpDigits}
                    onChange={(e) => setTotpDigits(Number(e.target.value) || 6)}
                    className="form-input"
                    min={6}
                    max={8}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="form-btn cancel-btn" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="form-btn save-btn" disabled={!name.trim()}>
            保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default EntryForm;
