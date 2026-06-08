import React, { useState } from 'react';
import { VaultEntry } from '../types';
import './EntryList.css';

interface EntryListProps {
  entries: VaultEntry[];
  onEdit: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onCopyField: (text: string, fieldName: string) => void;
}

const EntryList: React.FC<EntryListProps> = ({ entries, onEdit, onDelete, onCopyField }) => {
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (entries.length === 0) {
    return (
      <div className="entry-list-empty">
        <div className="empty-icon">🔒</div>
        <p className="empty-text">还没有密码条目</p>
        <p className="empty-hint">点击上方「添加条目」开始使用</p>
      </div>
    );
  }

  return (
    <div className="entry-list">
      {entries.map((entry) => (
        <div key={entry.id} className="entry-card">
          <div className="entry-main" onClick={() => onEdit(entry)}>
            <div className="entry-info">
              <div className="entry-name">{entry.name || '未命名'}</div>
              <div className="entry-meta">
                {entry.url && <span className="entry-url">{entry.url}</span>}
                {entry.username && <span className="entry-username">{entry.username}</span>}
              </div>
              {entry.tags.length > 0 && (
                <div className="entry-tags">
                  {entry.tags.map((tag, i) => (
                    <span key={i} className="entry-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="entry-actions">
            <div className="password-field">
              <span className="password-value">
                {visiblePasswords.has(entry.id) ? entry.password : '••••••••'}
              </span>
              <button
                className="action-btn"
                onClick={(e) => { e.stopPropagation(); togglePasswordVisibility(entry.id); }}
                title={visiblePasswords.has(entry.id) ? '隐藏密码' : '显示密码'}
              >
                {visiblePasswords.has(entry.id) ? '🙈' : '👁'}
              </button>
              <button
                className="action-btn"
                onClick={(e) => { e.stopPropagation(); onCopyField(entry.password, '密码'); }}
                title="复制密码"
              >
                📋
              </button>
            </div>

            <div className="entry-secondary-actions">
              {entry.username && (
                <button
                  className="action-btn-sm"
                  onClick={(e) => { e.stopPropagation(); onCopyField(entry.username, '用户名'); }}
                  title="复制用户名"
                >
                  复制用户名
                </button>
              )}
              {confirmDeleteId === entry.id ? (
                <div className="confirm-delete">
                  <span className="confirm-text">确认删除？</span>
                  <button
                    className="action-btn-sm danger"
                    onClick={(e) => { e.stopPropagation(); onDelete(entry.id); setConfirmDeleteId(null); }}
                  >
                    是
                  </button>
                  <button
                    className="action-btn-sm"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                  >
                    否
                  </button>
                </div>
              ) : (
                <button
                  className="action-btn-sm danger"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(entry.id); }}
                  title="删除"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EntryList;
