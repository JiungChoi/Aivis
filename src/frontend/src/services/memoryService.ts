import { apiFetch } from './apiClient';

const BASE = 'http://localhost:5050/api/memory';

export interface MemoryItem {
  id: string;
  userId: string;
  key: string;
  value: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMemoryPayload {
  key: string;
  value: string;
  source?: string;
}

export const memoryService = {
  async list(): Promise<MemoryItem[]> {
    const res = await apiFetch(BASE);
    if (!res.ok) throw new Error('메모리 로드 실패');
    const json = await res.json();
    return json.data as MemoryItem[];
  },

  async upsert(payload: UpsertMemoryPayload): Promise<MemoryItem> {
    const res = await apiFetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, source: payload.source ?? 'manual' }),
    });
    if (!res.ok) throw new Error('메모리 저장 실패');
    const json = await res.json();
    return json.data as MemoryItem;
  },

  async remove(id: string): Promise<void> {
    const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('메모리 삭제 실패');
  },
};
