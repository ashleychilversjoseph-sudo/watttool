import type { AppData } from '../types';

const STORAGE_KEY = 'sparky-toolkit:data:v2';
const BACKUP_KEY = 'sparky-toolkit:data:backup';

export const defaultData: AppData = {
  version: 2,
  jobs: [],
  notes: [],
  pinnedTools: ['diversity', 'cable', 'scientific', 'zs-pfc'],
  disclaimerAccepted: false,
  theme: 'dark',
};

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppData>;
  return candidate.version === 2 && Array.isArray(candidate.jobs) && Array.isArray(candidate.notes);
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed: unknown = JSON.parse(raw);
    if (!isAppData(parsed)) throw new Error('Unsupported local data format');
    return { ...defaultData, ...parsed };
  } catch {
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      const parsed: unknown = backup ? JSON.parse(backup) : null;
      return isAppData(parsed) ? { ...defaultData, ...parsed } : defaultData;
    } catch {
      return defaultData;
    }
  }
}

export function saveData(data: AppData): boolean {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function exportData(data: AppData): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'WATTtool', data }, null, 2);
}

export function importData(raw: string): AppData {
  const parsed: unknown = JSON.parse(raw);
  const value = parsed && typeof parsed === 'object' && 'data' in parsed
    ? (parsed as { data: unknown }).data
    : parsed;
  if (!isAppData(value)) throw new Error('This is not a valid WATTtool backup.');
  return { ...defaultData, ...value };
}
