import { apiGet } from './apiClient';

const BASE = '/api/news';

export interface NewsItem {
  tag: string;
  title: string;
  source: string;
  time: string;
  url?: string | null;
}

export const newsService = {
  getByCategory: (category: string) =>
    apiGet<NewsItem[]>(`${BASE}?category=${encodeURIComponent(category)}`, '뉴스 로드 실패'),
};
