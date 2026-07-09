import { useConversationStore } from '../../stores/conversationStore';

export default function Sidebar() {
  const { sessions, activeSessionId, selectSession, startNewSession, deleteSession } =
    useConversationStore();

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  return (
    <aside
      className="w-56 flex flex-col p-3"
      style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border-1)' }}
    >
      <div className="font-semibold text-lg mb-4 px-2" style={{ color: 'var(--text-1)' }}>AIVIS</div>

      <button
        onClick={startNewSession}
        className="ui-btn ui-btn-sm ui-btn-secondary mb-3"
        style={{ justifyContent: 'flex-start' }}
      >
        + 새 대화
      </button>

      <div className="flex-1 overflow-y-auto space-y-1">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              className="group relative flex items-center"
              style={{
                borderRadius: 'var(--r-sm)',
                background: isActive ? 'var(--accent-bg)' : 'transparent',
              }}
            >
              <button
                onClick={() => selectSession(session.id)}
                className="flex-1 text-left text-sm px-3 py-2 truncate"
              >
                <div className="truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-2)' }}>
                  {session.messages[0]?.content ?? '새 대화'}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{formatDate(session.createdAt)}</div>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 mr-2 flex-shrink-0 transition-opacity"
                style={{ borderRadius: 'var(--r-sm)', color: 'var(--text-3)' }}
                title="삭제"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
