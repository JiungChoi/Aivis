import { apiGet, apiPost, apiDelete } from './apiClient';

const BASE = '/api/memory';

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
  list: () => apiGet<MemoryItem[]>(BASE, '메모리 로드 실패'),

  upsert: (payload: UpsertMemoryPayload) =>
    apiPost<MemoryItem>(BASE, { ...payload, source: payload.source ?? 'manual' }, '메모리 저장 실패'),

  remove: (id: string) => apiDelete(`${BASE}/${id}`, '메모리 삭제 실패'),
};
