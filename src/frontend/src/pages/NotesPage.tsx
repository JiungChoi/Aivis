import { useState, useEffect } from 'react';
import { noteService, type NoteItem } from '../services/noteService';

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

// ── Inline markdown (bold, italic, inline code) ────────────────
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`\n]+`|\*[^*]+\*)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
          return <strong key={i} style={{ color: '#e2e8f0', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
          return (
            <code key={i} style={{
              background: '#0a0a0a', border: '1px solid rgba(84,84,88,0.35)', borderRadius: 4,
              padding: '1px 5px', fontSize: '0.9em', color: 'rgba(100,181,255,0.85)', fontFamily: 'monospace',
            }}>{part.slice(1, -1)}</code>
          );
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
          return <em key={i} style={{ color: '#9ca3af' }}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Block markdown renderer ────────────────────────────────────
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={nodes.length} style={{
          background: '#0a0a0a', border: '1px solid rgba(84,84,88,0.35)', borderRadius: 8,
          padding: '10px 12px', fontSize: 11, color: 'rgba(100,181,255,0.85)', overflowX: 'auto',
          fontFamily: 'monospace', lineHeight: 1.6, margin: '4px 0',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
    } else if (line.startsWith('### ')) {
      nodes.push(
        <div key={nodes.length} style={{ color: '#c4b5fd', fontWeight: 600, fontSize: 12, marginTop: 10 }}>
          <InlineText text={line.slice(4)} />
        </div>,
      );
    } else if (line.startsWith('## ')) {
      nodes.push(
        <div key={nodes.length} style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginTop: 12 }}>
          <InlineText text={line.slice(3)} />
        </div>,
      );
    } else if (line.startsWith('# ')) {
      nodes.push(
        <div key={nodes.length} style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 14 }}>
          <InlineText text={line.slice(2)} />
        </div>,
      );
    } else if (/^[-*] /.test(line)) {
      nodes.push(
        <div key={nodes.length} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginLeft: 4 }}>
          <span style={{ color: '#0a84ff', fontSize: 11, marginTop: 3, flexShrink: 0 }}>•</span>
          <span style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.65 }}>
            <InlineText text={line.slice(2)} />
          </span>
        </div>,
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1] ?? '1';
      nodes.push(
        <div key={nodes.length} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginLeft: 4 }}>
          <span style={{ color: '#64b5ff', fontSize: 11, marginTop: 3, flexShrink: 0, minWidth: 14 }}>{num}.</span>
          <span style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.65 }}>
            <InlineText text={line.slice(num.length + 2)} />
          </span>
        </div>,
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={nodes.length} style={{ height: 5 }} />);
    } else if (line.startsWith('---') || line.startsWith('===')) {
      nodes.push(<div key={nodes.length} style={{ height: 1, background: '#2c2c2e', margin: '8px 0' }} />);
    } else {
      nodes.push(
        <div key={nodes.length} style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.7 }}>
          <InlineText text={line} />
        </div>,
      );
    }
    i++;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{nodes}</div>;
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
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await noteService.remove(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const aiCount = notes.filter(n => n.source === 'conversation').length;
  const manualCount = notes.filter(n => n.source === 'manual').length;

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: '#000000' }}>

      {/* ── 좌측: 노트 목록 ── */}
      <div className="flex flex-col w-80 flex-shrink-0 overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* 헤더 */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ background: '#000000', boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.2)' }}>
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
                background: showAddForm ? 'rgba(255,255,255,0.06)' : 'rgba(96,165,250,0.14)',
                border: `1px solid ${showAddForm ? 'rgba(255,255,255,0.08)' : 'rgba(96,165,250,0.3)'}`,
                color: showAddForm ? '#6b7280' : '#64b5ff',
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
              className="w-full rounded-xl text-[11px] focus:outline-none placeholder-gray-700"
              style={{ background: '#0a1828', border: '1px solid rgba(255,255,255,0.06)', color: '#d1d5db', padding: '7px 10px 7px 27px' }}
            />
          </div>
        </div>

        {/* 추가 폼 */}
        {showAddForm && (
          <div
            className="mx-3 mb-3 rounded-2xl overflow-hidden flex-shrink-0"
            style={{
              background: '#1c1c1e',
              border: '1px solid rgba(96,165,250,0.18)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
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
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: 12, fontWeight: 500, caretColor: '#64b5ff' }}
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
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#6b7280', fontSize: 11, resize: 'none', caretColor: '#64b5ff' }}
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
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#4b5563', fontSize: 10, caretColor: '#64b5ff' }}
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
                  background: (newTitle.trim() && newContent.trim()) ? '#0a84ff' : 'rgba(37,99,235,0.18)',
                  color: (newTitle.trim() && newContent.trim()) ? '#fff' : 'rgba(235,235,245,0.25)',
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
            <div className="text-gray-700 text-[11px] text-center py-8">
              {search ? '검색 결과가 없습니다.' : 'AI와 대화하면 자동으로 노트가 저장됩니다.'}
            </div>
          ) : (
            notes.map(n => (
              <div
                key={n.id}
                onClick={() => setSelected(n)}
                className="rounded-xl p-3 cursor-pointer"
                style={{
                  background: selected?.id === n.id
                    ? 'rgba(37,37,39,0.72)'
                    : 'rgba(28,28,30,0.72)',
                  backdropFilter: 'blur(12px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
                  border: selected?.id === n.id ? '1px solid rgba(96,165,250,0.25)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: selected?.id === n.id
                    ? '0 0 0 1px rgba(96,165,250,0.1), 0 4px 16px rgba(37,99,235,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'
                    : '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (selected?.id !== n.id) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = selected?.id === n.id
                    ? '0 0 0 1px rgba(96,165,250,0.1), 0 4px 16px rgba(37,99,235,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'
                    : '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)';
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
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">{tag}</span>
                  ))}
                  <span className="text-gray-700 text-[9px]">{formatDate(n.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 통계 */}
        {!loading && !error && (
          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#000000' }}>
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
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">{tag}</span>
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
                width: 52, height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(109,40,217,0.06) 100%)',
                border: '1px solid rgba(196,181,253,0.15)',
                boxShadow: '0 0 24px rgba(139,92,246,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg style={{ width: 24, height: 24, color: '#c4b5fd' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 500 }}>노트를 선택하세요</div>
              <div style={{ color: 'rgba(235,235,245,0.25)', fontSize: 11, marginTop: 4 }}>AI와 대화하면 중요한 내용이 자동으로 저장됩니다</div>
              <div style={{
                marginTop: 16, padding: '8px 14px', borderRadius: 10,
                background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(196,181,253,0.1)',
                color: '#4a5d7a', fontSize: 10, lineHeight: 1.6,
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
