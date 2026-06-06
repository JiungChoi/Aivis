const BASE = 'http://localhost:5050/api/news';

export interface NewsItem {
  tag: string;
  title: string;
  source: string;
  time: string;
  url?: string | null;
}

export const newsService = {
  async getByCategory(category: string): Promise<NewsItem[]> {
    const res = await fetch(`${BASE}?category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error('뉴스 로드 실패');
    const json = await res.json();
    return json.data as NewsItem[];
  },
};
