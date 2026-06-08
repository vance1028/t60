import React, { useState } from 'react';
import { VaultEntry } from '../types';
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
