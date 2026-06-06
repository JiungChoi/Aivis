import { useConversationStore } from '../../stores/conversationStore';

export default function Sidebar() {
  const { sessions, activeSessionId, selectSession, startNewSession, deleteSession } =
    useConversationStore();

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-700 flex flex-col p-3">
      <div className="text-white font-bold text-lg mb-4 px-2">AIVIS</div>

      <button
        onClick={startNewSession}
        className="text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg px-3 py-2 text-left mb-3"
      >
        + 새 대화
      </button>

      <div className="flex-1 overflow-y-auto space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative flex items-center rounded-lg ${
              session.id === activeSessionId ? 'bg-gray-700' : 'hover:bg-gray-800'
            }`}
          >
            <button
              onClick={() => selectSession(session.id)}
              className="flex-1 text-left text-sm px-3 py-2 truncate"
            >
              <div className={`truncate ${session.id === activeSessionId ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                {session.messages[0]?.content ?? '새 대화'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{formatDate(session.createdAt)}</div>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 mr-2 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 flex-shrink-0 transition-opacity"
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
