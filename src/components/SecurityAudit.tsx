import React, { useState, useEffect } from 'react';
import { VaultEntry } from '../types';
import { runAudit, AuditReport, WeakPasswordIssue, DuplicatePasswordGroup, StalePasswordIssue } from '../utils/audit';
import './SecurityAudit.css';

interface SecurityAuditProps {
  entries: VaultEntry[];
  onNavigateToEntry: (entry: VaultEntry) => void;
  onBack: () => void;
}

const strengthLabels: Record<string, string> = {
  weak: '弱',
  fair: '一般',
  good: '良好',
  strong: '强',
  'very-strong': '非常强',
};

const strengthColors: Record<string, string> = {
  weak: '#e74c5e',
  fair: '#f39c12',
  good: '#f1c40f',
  strong: '#2ecc71',
  'very-strong': '#27ae60',
};

function getScoreColor(score: number): string {
  if (score >= 80) return '#2ecc71';
  if (score >= 60) return '#f1c40f';
  if (score >= 40) return '#f39c12';
  return '#e74c5e';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return '优秀';
  if (score >= 60) return '良好';
  if (score >= 40) return '一般';
  return '危险';
}

const SecurityAudit: React.FC<SecurityAuditProps> = ({ entries, onNavigateToEntry, onBack }) => {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    runAudit(entries).then((result) => {
      if (!cancelled) {
        setReport(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [entries]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="audit-container">
        <div className="audit-header">
          <h2 className="audit-title">安全体检</h2>
          <button className="back-btn" onClick={onBack}>返回</button>
        </div>
        <div className="audit-loading">正在扫描密码库...</div>
      </div>
    );
  }

  if (!report) return null;

  const scoreColor = getScoreColor(report.healthScore);
  const scoreLabel = getScoreLabel(report.healthScore);
  const hasIssues = report.weakPasswords.length > 0 || report.duplicatePasswords.length > 0 || report.stalePasswords.length > 0;
  const entryMap = new Map(entries.map((e) => [e.id, e]));

  const handleNavigate = (entryId: string) => {
    const entry = entryMap.get(entryId);
    if (entry) onNavigateToEntry(entry);
  };

  return (
    <div className="audit-container">
      <div className="audit-header">
        <h2 className="audit-title">安全体检</h2>
        <button className="back-btn" onClick={onBack}>返回</button>
      </div>

      <div className="audit-score-section">
        <div className="audit-score-ring">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - report.healthScore / 100)}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
            <text x="60" y="55" textAnchor="middle" fill={scoreColor} fontSize="28" fontWeight="700">
              {report.healthScore}
            </text>
            <text x="60" y="75" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">
              {scoreLabel}
            </text>
          </svg>
        </div>
        <div className="audit-score-summary">
          <div className="audit-summary-title">安全评分</div>
          <div className="audit-summary-stats">
            <span className="stat-item">
              <span className="stat-value">{report.totalEntries}</span>
              <span className="stat-label">总条目</span>
            </span>
            <span className="stat-item stat-good">
              <span className="stat-value">{report.summary.healthyCount}</span>
              <span className="stat-label">健康</span>
            </span>
            <span className="stat-item stat-warn">
              <span className="stat-value">{report.summary.weakCount}</span>
              <span className="stat-label">弱密码</span>
            </span>
            <span className="stat-item stat-warn">
              <span className="stat-value">{report.summary.duplicateCount}</span>
              <span className="stat-label">重复</span>
            </span>
            <span className="stat-item stat-warn">
              <span className="stat-value">{report.summary.staleCount}</span>
              <span className="stat-label">老旧</span>
            </span>
          </div>
        </div>
      </div>

      {!hasIssues && (
        <div className="audit-all-clear">
          <div className="all-clear-icon">✅</div>
          <div className="all-clear-text">所有密码都很安全！</div>
          <div className="all-clear-hint">继续保持良好的密码习惯</div>
        </div>
      )}

      {report.weakPasswords.length > 0 && (
        <AuditSection
          title="弱密码"
          icon="⚠️"
          count={report.weakPasswords.length}
          expanded={expandedSection === 'weak'}
          onToggle={() => toggleSection('weak')}
          color="var(--danger)"
        >
          {report.weakPasswords.map((issue) => (
            <AuditItem
              key={issue.entryId}
              name={issue.entryName}
              detail={`${strengthLabels[issue.strength] || issue.strength} (${issue.score}/10)`}
              detailColor={strengthColors[issue.strength] || '#e74c5e'}
              onClick={() => handleNavigate(issue.entryId)}
            />
          ))}
        </AuditSection>
      )}

      {report.duplicatePasswords.length > 0 && (
        <AuditSection
          title="重复使用的密码"
          icon="🔄"
          count={report.duplicatePasswords.reduce((s, g) => s + g.entries.length, 0)}
          expanded={expandedSection === 'duplicate'}
          onToggle={() => toggleSection('duplicate')}
          color="var(--warning)"
        >
          {report.duplicatePasswords.map((group, idx) => (
            <div key={idx} className="audit-duplicate-group">
              <div className="duplicate-group-label">
                重复组 {idx + 1}（{group.entries.length} 个条目使用相同密码）
              </div>
              {group.entries.map((e) => (
                <AuditItem
                  key={e.entryId}
                  name={e.entryName}
                  detail="重复密码"
                  detailColor="var(--warning)"
                  onClick={() => handleNavigate(e.entryId)}
                />
              ))}
            </div>
          ))}
        </AuditSection>
      )}

      {report.stalePasswords.length > 0 && (
        <AuditSection
          title="老旧密码"
          icon="🕐"
          count={report.stalePasswords.length}
          expanded={expandedSection === 'stale'}
          onToggle={() => toggleSection('stale')}
          color="#f39c12"
        >
          {report.stalePasswords.map((issue) => (
            <AuditItem
              key={issue.entryId}
              name={issue.entryName}
              detail={`已 ${issue.daysSinceUpdate} 天未更新`}
              detailColor="#f39c12"
              onClick={() => handleNavigate(issue.entryId)}
            />
          ))}
        </AuditSection>
      )}
    </div>
  );
};

const AuditSection: React.FC<{
  title: string;
  icon: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  color: string;
  children: React.ReactNode;
}> = ({ title, icon, count, expanded, onToggle, color, children }) => (
  <div className="audit-section">
    <button className="audit-section-header" onClick={onToggle}>
      <div className="section-header-left">
        <span className="section-icon">{icon}</span>
        <span className="section-title">{title}</span>
        <span className="section-count" style={{ background: `${color}22`, color }}>{count}</span>
      </div>
      <span className={`section-expand ${expanded ? 'expanded' : ''}`}>▶</span>
    </button>
    {expanded && (
      <div className="audit-section-content">
        {children}
      </div>
    )}
  </div>
);

const AuditItem: React.FC<{
  name: string;
  detail: string;
  detailColor: string;
  onClick: () => void;
}> = ({ name, detail, detailColor, onClick }) => (
  <button className="audit-item" onClick={onClick}>
    <span className="audit-item-name">{name}</span>
    <span className="audit-item-detail" style={{ color: detailColor }}>{detail}</span>
    <span className="audit-item-arrow">→</span>
  </button>
);

export default SecurityAudit;
