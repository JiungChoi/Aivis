import { apiFetch } from './apiClient';

const BASE = 'http://localhost:5050/api/notes';

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
  async list(limit = 20): Promise<NoteItem[]> {
    const res = await apiFetch(`${BASE}?limit=${limit}`);
    if (!res.ok) throw new Error('노트 로드 실패');
    const json = await res.json();
    return json.data as NoteItem[];
  },

  async search(query: string): Promise<NoteItem[]> {
    const res = await apiFetch(`${BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('노트 검색 실패');
    const json = await res.json();
    return json.data as NoteItem[];
  },

  async create(payload: CreateNotePayload): Promise<NoteItem> {
    const res = await apiFetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('노트 생성 실패');
    const json = await res.json();
    return json.data as NoteItem;
  },

  async remove(id: string): Promise<void> {
    const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('노트 삭제 실패');
  },
};
