export function generatePassword(options: {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
}): string {
  const charSets: Record<string, string> = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  };

  let pool = '';
  const required: string[] = [];

  if (options.uppercase) {
    pool += charSets.uppercase;
    required.push(charSets.uppercase);
  }
  if (options.lowercase) {
    pool += charSets.lowercase;
    required.push(charSets.lowercase);
  }
  if (options.digits) {
    pool += charSets.digits;
    required.push(charSets.digits);
  }
  if (options.symbols) {
    pool += charSets.symbols;
    required.push(charSets.symbols);
  }

  if (pool.length === 0) {
    pool = charSets.lowercase + charSets.uppercase + charSets.digits;
    required.push(charSets.lowercase);
  }

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  const result: string[] = [];

  for (let i = 0; i < Math.min(required.length, options.length); i++) {
    const charSet = required[i];
    const idx = array[i] % charSet.length;
    result.push(charSet[idx]);
  }

  for (let i = required.length; i < options.length; i++) {
    const idx = array[i] % pool.length;
    result.push(pool[idx]);
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';

export function evaluatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  feedback: string;
} {
  if (!password) {
    return { strength: 'weak', score: 0, feedback: '请输入密码' };
  }

  let score = 0;
  const len = password.length;

  if (len >= 8) score += 1;
  if (len >= 12) score += 1;
  if (len >= 16) score += 1;
  if (len >= 20) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  const uniqueChars = new Set(password).size;
  const uniqueRatio = uniqueChars / len;
  if (uniqueRatio > 0.7) score += 1;
  if (uniqueRatio > 0.9) score += 1;

  if (/(.)\1{2,}/.test(password)) score -= 1;
  if (/^[0-9]+$/.test(password)) score -= 2;
  if (/^[a-zA-Z]+$/.test(password)) score -= 1;

  const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  const lower = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (lower.includes(pattern)) score -= 2;
  }

  score = Math.max(0, Math.min(10, score));

  let strength: PasswordStrength;
  let feedback: string;

  if (score <= 2) {
    strength = 'weak';
    feedback = '非常弱，极易被破解';
  } else if (score <= 4) {
    strength = 'fair';
    feedback = '一般，建议增加复杂度';
  } else if (score <= 6) {
    strength = 'good';
    feedback = '良好，可以考虑加长';
  } else if (score <= 8) {
    strength = 'strong';
    feedback = '强密码，安全性较好';
  } else {
    strength = 'very-strong';
    feedback = '非常强，安全性极高';
  }

  return { strength, score, feedback };
}
