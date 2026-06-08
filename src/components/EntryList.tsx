import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VaultEntry } from '../types';
import { generateTOTP, getTimeRemaining, getProgress } from '../utils/totp';
import './EntryList.css';

interface EntryListProps {
  entries: VaultEntry[];
  onEdit: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onCopyField: (text: string, fieldName: string) => void;
}

const TOTPCode: React.FC<{
  entry: VaultEntry;
  onCopy: (text: string, label: string) => void;
}> = ({ entry, onCopy }) => {
  const [code, setCode] = useState<string>('');
  const [progress, setProgress] = useState<number>(1);
  const [remaining, setRemaining] = useState<number>(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const period = entry.totpPeriod || 30;
  const digits = entry.totpDigits || 6;

  const updateCode = useCallback(async () => {
    if (!entry.totpSecret) return;
    try {
      const newCode = await generateTOTP(entry.totpSecret, period, digits);
      setCode(newCode);
    } catch {
      setCode('------');
    }
    const rem = getTimeRemaining(period);
    setRemaining(rem);
    setProgress(getProgress(period));
  }, [entry.totpSecret, period, digits]);

  useEffect(() => {
    updateCode();
    timerRef.current = setInterval(updateCode, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [updateCode]);

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const formatCode = (c: string) => {
    if (c.length === 6) return `${c.slice(0, 3)} ${c.slice(3)}`;
    if (c.length === 8) return `${c.slice(0, 4)} ${c.slice(4)}`;
    return c;
  };

  const isLow = remaining <= 5;

  return (
    <div className="totp-display">
      <div className="totp-code-row">
        <svg className="totp-countdown" width="38" height="38" viewBox="0 0 38 38">
          <circle
            cx="19" cy="19" r={radius}
            fill="none"
            stroke="var(--bg-tertiary)"
            strokeWidth="3"
          />
          <circle
            cx="19" cy="19" r={radius}
            fill="none"
            stroke={isLow ? 'var(--danger)' : 'var(--accent)'}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 19 19)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
          <text
            x="19" y="20"
            textAnchor="middle"
            dominantBaseline="central"
            fill={isLow ? 'var(--danger)' : 'var(--text-secondary)'}
            fontSize="11"
            fontWeight="600"
          >
            {remaining}
          </text>
        </svg>
        <span className={`totp-code ${isLow ? 'totp-code-low' : ''}`}>
          {formatCode(code)}
        </span>
        <button
          className="action-btn"
          onClick={(e) => { e.stopPropagation(); onCopy(code, '验证码'); }}
          title="复制验证码"
          disabled={!code || code === '------'}
        >
          📋
        </button>
      </div>
    </div>
  );
};

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

            {entry.totpSecret && (
              <TOTPCode entry={entry} onCopy={onCopyField} />
            )}

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
