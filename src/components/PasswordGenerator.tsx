import React, { useState, useMemo } from 'react';
import { generatePassword, evaluatePasswordStrength, PasswordStrength } from '../utils/password';
import './PasswordGenerator.css';

interface PasswordGeneratorProps {
  onUsePassword: (password: string) => void;
  onBack: () => void;
  onCopy: (text: string, fieldName: string) => void;
  embedded?: boolean;
}

const strengthColors: Record<PasswordStrength, string> = {
  weak: '#e74c5e',
  fair: '#f39c12',
  good: '#f1c40f',
  strong: '#2ecc71',
  'very-strong': '#27ae60',
};

const strengthLabels: Record<PasswordStrength, string> = {
  weak: '弱',
  fair: '一般',
  good: '良好',
  strong: '强',
  'very-strong': '非常强',
};

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onUsePassword, onBack, onCopy, embedded }) => {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [generated, setGenerated] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const strengthResult = useMemo(() => {
    const pwd = showCustom ? customInput : generated;
    return evaluatePasswordStrength(pwd);
  }, [generated, customInput, showCustom]);

  const handleGenerate = () => {
    const pwd = generatePassword({ length, uppercase, lowercase, digits, symbols });
    setGenerated(pwd);
    setShowCustom(false);
  };

  const handleCopy = () => {
    const pwd = showCustom ? customInput : generated;
    if (pwd) {
      onCopy(pwd, '密码');
    }
  };

  const handleUse = () => {
    const pwd = showCustom ? customInput : generated;
    if (pwd) {
      onUsePassword(pwd);
    }
  };

  React.useEffect(() => {
    handleGenerate();
  }, []);

  const displayPassword = showCustom ? customInput : generated;

  return (
    <div className={`generator-container ${embedded ? 'embedded' : ''}`}>
      {!embedded && (
        <div className="generator-header">
          <h2 className="generator-title">密码生成器</h2>
          <button className="back-btn" onClick={onBack}>返回</button>
        </div>
      )}

      <div className="generator-display">
        <div className="generated-password">
          {displayPassword || '点击生成按钮'}
        </div>
        <button className="gen-action-btn" onClick={handleCopy} disabled={!displayPassword} title="复制">
          📋
        </button>
      </div>

      {displayPassword && (
        <div className="strength-bar-container">
          <div className="strength-bar">
            <div
              className="strength-fill"
              style={{
                width: `${(strengthResult.score / 10) * 100}%`,
                background: strengthColors[strengthResult.strength],
              }}
            />
          </div>
          <div className="strength-info">
            <span className="strength-label" style={{ color: strengthColors[strengthResult.strength] }}>
              {strengthLabels[strengthResult.strength]}
            </span>
            <span className="strength-feedback">{strengthResult.feedback}</span>
          </div>
        </div>
      )}

      <div className="generator-options">
        <div className="option-row">
          <label className="option-label">长度: {length}</label>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="length-slider"
          />
        </div>

        <div className="option-checkboxes">
          <label className="checkbox-label">
            <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
            <span>大写字母 (A-Z)</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={lowercase} onChange={(e) => setLowercase(e.target.checked)} />
            <span>小写字母 (a-z)</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={digits} onChange={(e) => setDigits(e.target.checked)} />
            <span>数字 (0-9)</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} />
            <span>符号 (!@#$...)</span>
          </label>
        </div>
      </div>

      <div className="generator-actions">
        <button className="gen-btn primary" onClick={handleGenerate}>
          生成密码
        </button>
        <button className="gen-btn secondary" onClick={() => setShowCustom(!showCustom)}>
          {showCustom ? '隐藏手动输入' : '手动输入评估'}
        </button>
      </div>

      {showCustom && (
        <div className="custom-input-section">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="custom-input"
            placeholder="输入要评估强度的密码..."
          />
        </div>
      )}

      {displayPassword && (
        <button className="gen-btn use-btn" onClick={handleUse}>
          使用此密码
        </button>
      )}
    </div>
  );
};

export default PasswordGenerator;
