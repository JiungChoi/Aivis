import type { NewsItem } from '../../services/newsService';
import { TAG_COLORS, type NewsTab, NEWS_TABS } from './dashboardConstants';

interface NewsColumnProps {
  news: NewsItem[];
  newsTab: NewsTab;
  onSelectTab: (tab: NewsTab) => void;
}

export function NewsColumn({ news, newsTab, onSelectTab }: NewsColumnProps) {
  return (
    <div className="flex-col overflow-hidden" style={{ flex: '1 1 0', minWidth: 160, display: 'flex', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
      {/* 제목 */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <span style={{
          color: 'rgba(235,235,245,0.92)',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '-0.01em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>뉴스</span>
      </div>
      {/* 탭 (언더라인 스타일) */}
      <div className="flex-shrink-0 px-4 flex gap-5 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(84,84,88,0.25)' }}>
        {NEWS_TABS.map((tab) => (
          <button key={tab} onClick={() => onSelectTab(tab)}
            className="flex-shrink-0 text-[11px] px-0.5 pb-2 pt-0.5 transition-colors relative"
            style={{
              color: newsTab === tab ? 'var(--accent)' : 'rgba(235,235,245,0.4)',
              fontWeight: newsTab === tab ? 600 : 400,
            }}
            onMouseEnter={(e) => { if (newsTab !== tab) (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.7)'; }}
            onMouseLeave={(e) => { if (newsTab !== tab) (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.4)'; }}
          >
            {tab}
            {newsTab === tab && (
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: -1, height: 2,
                borderRadius: 2, background: 'var(--accent)',
              }} />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {news.length === 0 ? (
          <div className="text-gray-600 text-[11px] text-center py-8">뉴스를 불러오는 중...</div>
        ) : (
          news.map((item, i) => (
            <a
              key={i}
              href={item.url ?? '#'}
              target={item.url ? '_blank' : undefined}
              rel={item.url ? 'noopener noreferrer' : undefined}
              className="block rounded-lg px-3 py-2 cursor-pointer group"
              style={{
                background: 'rgba(28,28,30,0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(255,255,255,0.05)';
                el.style.borderLeftColor = 'var(--accent)';
                el.style.borderLeftWidth = '2px';
                el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.35)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(255,255,255,0.05)';
                el.style.borderLeftWidth = '1px';
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
              }}
            >
              <div className="flex items-start gap-2.5">
                <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded mt-0.5 ${TAG_COLORS[item.tag] ?? 'bg-gray-500/20 text-gray-400'}`}>
                  {item.tag}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-200 text-xs leading-snug group-hover:text-white transition-colors line-clamp-2">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-600 text-[10px]">{item.source}</span>
                    {item.time && (
                      <>
                        <span className="text-gray-800 text-[10px]">·</span>
                        <span className="text-gray-600 text-[10px]">{item.time} 전</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
