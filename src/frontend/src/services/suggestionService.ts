import { apiGet } from './apiClient';

const BASE = '/api/suggestions';

export interface SuggestionItem {
  icon: string;
  title: string;
  reason: string;
  priority: '높음' | '보통' | '낮음';
}

export const suggestionService = {
  get: () => apiGet<SuggestionItem[]>(BASE, '제안 로드 실패'),
};
