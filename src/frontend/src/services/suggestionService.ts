const BASE = 'http://localhost:5050/api/suggestions';

export interface SuggestionItem {
  icon: string;
  title: string;
  reason: string;
  priority: '높음' | '보통' | '낮음';
}

export const suggestionService = {
  async get(): Promise<SuggestionItem[]> {
    const res = await fetch(BASE);
    if (!res.ok) throw new Error('제안 로드 실패');
    const json = await res.json();
    return json.data as SuggestionItem[];
  },
};
