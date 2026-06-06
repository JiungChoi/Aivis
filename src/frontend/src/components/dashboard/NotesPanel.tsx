import type { NoteItem } from '../../services/noteService';

interface Props {
  notes: NoteItem[];
  noteSearch: string;
  error: boolean;
  onSearchChange: (q: string) => void;
  onRetry: () => void;
}

export function NotesPanel({ notes, noteSearch, error, onSearchChange, onRetry }: Props) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{
          color: 'rgba(235,235,245,0.35)',
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: '0.05em',
          textTransform: 'uppercase' as const,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>노트</span>
        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Second Brain</span>
      </div>
      <input
        type="text"
        placeholder="노트 검색..."
        value={noteSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-lg text-[11px] px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder-gray-700"
        style={{ background: '#0a1422', border: '1px solid #1a2a3a', color: '#d1d5db' }}
      />
      {error ? (
        <div className="text-center py-4">
          <div className="text-red-400 text-[10px] mb-1">노트를 불러오지 못했습니다.</div>
          <button onClick={onRetry} className="text-[10px] text-blue-400 hover:text-blue-300 underline">재시도</button>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-gray-700 text-[10px] text-center py-4">
          {noteSearch ? '검색 결과가 없습니다.' : 'AI와 대화하면 자동으로 노트가 저장됩니다.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {notes.map((note) => (
            <div key={note.id}
              className="rounded-lg p-2.5 hover:bg-white/5 transition-colors"
              style={{ background: '#0d1829', border: '1px solid #1a2a3a' }}>
              <div className="text-gray-200 text-[11px] font-medium leading-snug truncate">{note.title}</div>
              <div className="text-gray-600 text-[10px] mt-0.5 leading-snug line-clamp-2">
                {note.content.length > 80 ? note.content.slice(0, 80) + '...' : note.content}
              </div>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
