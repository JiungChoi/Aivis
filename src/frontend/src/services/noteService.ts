import { apiGet, apiPost, apiDelete } from './apiClient';

const BASE = '/api/notes';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  title: string;
  content: string;
  tags?: string[];
  source?: string;
}

export const noteService = {
  list: (limit = 20) => apiGet<NoteItem[]>(`${BASE}?limit=${limit}`, '노트 로드 실패'),

  search: (query: string) =>
    apiGet<NoteItem[]>(`${BASE}/search?q=${encodeURIComponent(query)}`, '노트 검색 실패'),

  create: (payload: CreateNotePayload) =>
    apiPost<NoteItem>(BASE, payload, '노트 생성 실패'),

  remove: (id: string) => apiDelete(`${BASE}/${id}`, '노트 삭제 실패'),
};
