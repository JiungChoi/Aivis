const BASE = 'http://localhost:5050/api/obsidian';

export interface ObsidianSettings {
  vaultPath: string;
  isEnabled: boolean;
}

export const obsidianService = {
  async getSettings(): Promise<ObsidianSettings> {
    const res = await fetch(`${BASE}/settings`);
    if (!res.ok) throw new Error('설정 로드 실패');
    const json = await res.json();
    return json.data as ObsidianSettings;
  },

  async updateSettings(vaultPath: string, enabled: boolean): Promise<ObsidianSettings> {
    const res = await fetch(`${BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultPath, enabled }),
    });
    if (!res.ok) throw new Error('설정 저장 실패');
    const json = await res.json();
    return json.data as ObsidianSettings;
  },

  async syncAll(): Promise<{ syncedCount: number }> {
    const res = await fetch(`${BASE}/sync`, { method: 'POST' });
    if (!res.ok) throw new Error('동기화 실패');
    const json = await res.json();
    return json.data as { syncedCount: number };
  },
};
