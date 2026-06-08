import { VaultEntry } from '../types';
import { evaluatePasswordStrength } from './password';

export interface WeakPasswordIssue {
  entryId: string;
  entryName: string;
  strength: string;
  score: number;
}

export interface DuplicatePasswordGroup {
  passwordHash: string;
  entries: Array<{ entryId: string; entryName: string }>;
}

export interface StalePasswordIssue {
  entryId: string;
  entryName: string;
  updatedAt: number;
  daysSinceUpdate: number;
}

export interface AuditReport {
  weakPasswords: WeakPasswordIssue[];
  duplicatePasswords: DuplicatePasswordGroup[];
  stalePasswords: StalePasswordIssue[];
  totalEntries: number;
  healthScore: number;
  summary: {
    weakCount: number;
    duplicateCount: number;
    staleCount: number;
    healthyCount: number;
  };
}

const DEFAULT_STALE_DAYS = 90;

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function runAudit(
  entries: VaultEntry[],
  staleDays: number = DEFAULT_STALE_DAYS
): Promise<AuditReport> {
  const weakPasswords: WeakPasswordIssue[] = [];
  const stalePasswords: StalePasswordIssue[] = [];
  const passwordGroups = new Map<string, Array<{ entryId: string; entryName: string }>>();

  const problematicIds = new Set<string>();
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.password) continue;

    const strengthResult = evaluatePasswordStrength(entry.password);
    if (strengthResult.score <= 4) {
      weakPasswords.push({
        entryId: entry.id,
        entryName: entry.name || '未命名',
        strength: strengthResult.strength,
        score: strengthResult.score,
      });
      problematicIds.add(entry.id);
    }

    const daysSinceUpdate = Math.floor((now - entry.updatedAt) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate > staleDays) {
      stalePasswords.push({
        entryId: entry.id,
        entryName: entry.name || '未命名',
        updatedAt: entry.updatedAt,
        daysSinceUpdate,
      });
      problematicIds.add(entry.id);
    }

    const hash = await hashPassword(entry.password);
    if (!passwordGroups.has(hash)) {
      passwordGroups.set(hash, []);
    }
    passwordGroups.get(hash)!.push({
      entryId: entry.id,
      entryName: entry.name || '未命名',
    });
  }

  const duplicatePasswords: DuplicatePasswordGroup[] = [];
  for (const [hash, group] of passwordGroups) {
    if (group.length > 1) {
      duplicatePasswords.push({ passwordHash: hash, entries: group });
      for (const e of group) {
        problematicIds.add(e.entryId);
      }
    }
  }

  const totalEntries = entries.length;
  const healthyCount = totalEntries - problematicIds.size;

  const weakRatio = weakPasswords.length / Math.max(totalEntries, 1);
  const dupRatio = duplicatePasswords.length / Math.max(totalEntries, 1);
  const staleRatio = stalePasswords.length / Math.max(totalEntries, 1);

  const healthScore = Math.round(
    Math.max(0, Math.min(100, 100 - weakRatio * 40 - dupRatio * 35 - staleRatio * 25))
  );

  return {
    weakPasswords,
    duplicatePasswords,
    stalePasswords,
    totalEntries,
    healthScore,
    summary: {
      weakCount: weakPasswords.length,
      duplicateCount: duplicatePasswords.reduce((sum, g) => sum + g.entries.length, 0),
      staleCount: stalePasswords.length,
      healthyCount,
    },
  };
}
