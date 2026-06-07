import { apiGet, apiPut, apiPost } from './apiClient';

const BASE = '/api/obsidian';

export interface ObsidianSettings {
  vaultPath: string;
  isEnabled: boolean;
}

export const obsidianService = {
  getSettings: () => apiGet<ObsidianSettings>(`${BASE}/settings`, '설정 로드 실패'),

  updateSettings: (vaultPath: string, enabled: boolean) =>
    apiPut<ObsidianSettings>(`${BASE}/settings`, { vaultPath, enabled }, '설정 저장 실패'),

  syncAll: () => apiPost<{ syncedCount: number }>(`${BASE}/sync`, undefined, '동기화 실패'),
};
