import { useState, useEffect } from 'react';
import { noteService, type NoteItem } from '../services/noteService';
import { toast } from '../stores/toastStore';
import { RenderMarkdown } from '../components/markdown/Markdown';

const SOURCE_COLORS: Record<string, string> = {
  conversation: 'bg-blue-500/20 text-blue-400',
  manual:       'bg-emerald-500/20 text-emerald-400',
};

const SOURCE_LABELS: Record<string, string> = {
  conversation: 'AI가 저장',
  manual:       '직접 작성',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<NoteItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    noteService.list(50)
      .then(data => { setNotes(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(load, []);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) { load(); return; }
    const timer = setTimeout(() => {
      noteService.search(search).then(setNotes).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleAdd() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const created = await noteService.create({
        title: newTitle.trim(), content: newContent.trim(), tags, source: 'manual',
      });
      setNotes(prev => [created, ...prev]);
      setNewTitle(''); setNewContent(''); setNewTags('');
      setShowAddForm(false);
      setSelected(created);
      toast.success('노트를 저장했습니다');
    } catch {
      toast.error('노트를 저장하지 못했습니다');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await noteService.remove(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success('노트를 삭제했습니다');
    } catch {
      toast.error('노트를 삭제하지 못했습니다');
    }
  }

  const aiCount = notes.filter(n => n.source === 'conversation').length;
  const manualCount = notes.filter(n => n.source === 'manual').length;

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: 'var(--bg-0)' }}>

      {/* ── 좌측: 노트 목록 ── */}
      <div className="flex flex-col w-80 flex-shrink-0 overflow-hidden" style={{ borderRight: '1px solid var(--border-1)' }}>

        {/* 헤더 */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ background: 'var(--bg-1)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white font-semibold text-sm">노트</div>
              <div className="text-gray-600 text-[10px] mt-0.5">AI가 저장하거나 직접 작성한 노트</div>
            </div>
            <button
              onClick={() => { setShowAddForm(v => !v); setSelected(null); }}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: showAddForm ? 'rgba(255,255,255,0.06)' : 'var(--accent-bg)',
                border: `1px solid ${showAddForm ? 'var(--border-2)' : 'var(--accent-border)'}`,
                color: showAddForm ? 'var(--text-3)' : 'var(--accent)',
                fontSize: 16, lineHeight: 1, cursor: 'pointer',
                transition: 'all 0.15s ease', flexShrink: 0,
              }}
            >
              {showAddForm ? '×' : '+'}
            </button>
          </div>

          {/* 검색 */}
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 11, height: 11, color: '#4b5563', pointerEvents: 'none' }}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-[11px] focus:outline-none placeholder-gray-700"
              style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', color: 'var(--text-1)', padding: '7px 10px 7px 27px' }}
            />
          </div>
        </div>

        {/* 추가 폼 */}
        {showAddForm && (
          <div
            className="mx-3 mb-3 rounded-2xl overflow-hidden flex-shrink-0"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border-2)',
              boxShadow: 'var(--shadow-overlay)',
              animation: 'bubble-pop-in 0.18s ease forwards',
            }}
          >
            <div style={{ padding: '11px 12px 7px' }}>
              <input
                type="text"
                placeholder="노트 제목"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: 12, fontWeight: 500, caretColor: 'var(--accent)' }}
                className="placeholder-gray-700"
              />
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 12px' }} />
            <div style={{ padding: '7px 12px' }}>
              <textarea
                placeholder="내용을 입력하세요 (마크다운 지원)"
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                rows={3}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#6b7280', fontSize: 11, resize: 'none', caretColor: 'var(--accent)' }}
                className="placeholder-gray-800"
              />
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 12px' }} />
            <div style={{ padding: '5px 12px 7px' }}>
              <input
                type="text"
                placeholder="태그 (쉼표로 구분, 선택사항)"
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#4b5563', fontSize: 10, caretColor: 'var(--accent)' }}
                className="placeholder-gray-800"
              />
            </div>
            <div style={{ display: 'flex', gap: 5, padding: '6px 12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => { setShowAddForm(false); setNewTitle(''); setNewContent(''); setNewTags(''); }}
                style={{ padding: '5px 9px', borderRadius: 7, fontSize: 10, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280' }}
              >취소</button>
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim() || !newContent.trim() || saving}
                style={{
                  flex: 1, padding: '5px', borderRadius: 7, fontSize: 10, fontWeight: 600, border: 'none',
                  background: (newTitle.trim() && newContent.trim()) ? 'var(--accent)' : 'var(--accent-bg)',
                  color: (newTitle.trim() && newContent.trim()) ? 'var(--on-accent)' : 'var(--text-3)',
                  cursor: (newTitle.trim() && newContent.trim()) ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
              >{saving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        )}

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: '#1c1c1e', border: '1px solid rgba(84,84,88,0.35)' }}>
                <div className="h-2.5 bg-gray-800 rounded w-2/3 mb-2" />
                <div className="h-2 bg-gray-800 rounded w-full mb-1" />
                <div className="h-2 bg-gray-800 rounded w-3/4" />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 text-[11px] mb-2">노트를 불러오지 못했습니다.</div>
              <button onClick={load} className="text-[11px] text-blue-400 hover:text-blue-300 underline">재시도</button>
            </div>
          ) : notes.length === 0 ? (
            search ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 16px', gap: 12, textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--r-md)',
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg style={{ width: 22, height: 22, color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
                  </svg>
                </div>
                <div>
                  <div style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>일치하는 노트가 없어요</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 4, lineHeight: 1.6 }}>
                    "{search}" 검색 결과가 없어요
                  </div>
                </div>
                <button
                  onClick={() => setSearch('')}
                  className="ui-btn ui-btn-sm ui-btn-secondary"
                >검색 초기화</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 16px', gap: 12, textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--r-md)',
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg style={{ width: 24, height: 24, color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <div style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>아직 노트가 없어요</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 4, lineHeight: 1.6 }}>
                    AI와 대화하거나 직접 노트를<br />작성해보세요
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddForm(true); setSelected(null); }}
                  className="ui-btn ui-btn-sm ui-btn-primary"
                >노트 작성하기</button>
              </div>
            )
          ) : (
            notes.map(n => (
              <div
                key={n.id}
                onClick={() => setSelected(n)}
                className="p-3 cursor-pointer"
                style={{
                  background: selected?.id === n.id ? 'var(--bg-3)' : 'var(--bg-2)',
                  borderRadius: 'var(--r-md)',
                  border: selected?.id === n.id ? '1px solid var(--accent-border)' : '1px solid var(--border-1)',
                  transition: 'background var(--dur-2) var(--ease), border-color var(--dur-2) var(--ease)',
                }}
                onMouseEnter={e => {
                  if (selected?.id !== n.id) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
                  }
                }}
                onMouseLeave={e => {
                  if (selected?.id !== n.id) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-1)';
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[11px] font-medium truncate">{n.title}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5 line-clamp-2 leading-snug">{n.content}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
                    className="flex-shrink-0 text-gray-700 hover:text-red-400 transition-colors text-[10px]"
                  >✕</button>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${SOURCE_COLORS[n.source] ?? 'bg-gray-500/20 text-gray-500'}`}>
                    {SOURCE_LABELS[n.source] ?? n.source}
                  </span>
                  {n.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-[var(--text-2)]">{tag}</span>
                  ))}
                  <span className="text-gray-700 text-[9px]">{formatDate(n.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 통계 */}
        {!loading && !error && (
          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
            <div className="flex gap-3">
              <div className="text-center">
                <div className="text-white font-bold text-sm">{notes.length}</div>
                <div className="text-gray-600 text-[9px]">총 노트</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-sm">{aiCount}</div>
                <div className="text-gray-600 text-[9px]">AI 저장</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-sm">{manualCount}</div>
                <div className="text-gray-600 text-[9px]">직접 작성</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 우측: 상세 뷰 ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl">
              {/* 제목 + 메타 */}
              <div className="flex items-start justify-between mb-5 gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-white font-semibold text-lg leading-tight">{selected.title}</h1>
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${SOURCE_COLORS[selected.source] ?? 'bg-gray-500/20 text-gray-500'}`}>
                      {SOURCE_LABELS[selected.source] ?? selected.source}
                    </span>
                    {selected.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-[var(--text-2)]">{tag}</span>
                    ))}
                    <span className="text-gray-600 text-[10px]">저장: {formatDate(selected.createdAt)}</span>
                    {selected.updatedAt !== selected.createdAt && (
                      <span className="text-gray-700 text-[10px]">수정: {formatDate(selected.updatedAt)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-medium transition-colors"
                >삭제</button>
              </div>

              {/* 본문 */}
              <div className="rounded-xl p-5" style={{ background: 'rgba(28,28,30,0.72)', backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                <RenderMarkdown text={selected.content} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--r-md)',
                background: 'var(--bg-3)',
                border: '1px solid var(--border-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg style={{ width: 24, height: 24, color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 500 }}>노트를 선택하세요</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>AI와 대화하면 중요한 내용이 자동으로 저장됩니다</div>
              <div style={{
                marginTop: 16, padding: '8px 14px', borderRadius: 'var(--r-sm)',
                background: 'var(--bg-sunken)', border: '1px solid var(--border-1)',
                color: 'var(--text-3)', fontSize: 10, lineHeight: 1.6,
              }}>
                + 버튼으로 직접 노트를 작성할 수도 있어요
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
