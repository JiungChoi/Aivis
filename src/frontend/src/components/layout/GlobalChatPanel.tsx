import { useState, useEffect, useRef, useCallback } from 'react';
import { useConversationStore } from '../../stores/conversationStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { voiceService } from '../../services/voiceService';
import { conversationService } from '../../services/conversationService';
import HoloJarvis from './HoloJarvis';

// ── Chat markdown renderer ────────────────────────────────────────────
function ChatInline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
          return <strong key={i} style={{ fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
          return (
            <code key={i} style={{
              background: 'rgba(0,0,0,0.35)', borderRadius: 3,
              padding: '1px 4px', fontSize: '0.88em',
              fontFamily: 'monospace', color: 'rgba(100,181,255,0.85)',
            }}>{p.slice(1, -1)}</code>
          );
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
          return <em key={i} style={{ color: '#9ca3af' }}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function ChatMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
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
          background: 'rgba(0,0,0,0.35)', borderRadius: 6, padding: '8px 10px',
          fontSize: 10, color: 'rgba(100,181,255,0.85)', overflowX: 'auto',
          fontFamily: 'monospace', lineHeight: 1.55, margin: '3px 0',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
    } else if (line.startsWith('### ') || line.startsWith('## ')) {
      const lvl = line.startsWith('### ') ? 4 : 3;
      nodes.push(
        <div key={nodes.length} style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 11, marginTop: 5 }}>
          <ChatInline text={line.slice(lvl)} />
        </div>,
      );
    } else if (/^[-*] /.test(line)) {
      nodes.push(
        <div key={nodes.length} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
          <span style={{ color: '#64b5ff', fontSize: 10, marginTop: 2, flexShrink: 0 }}>•</span>
          <span><ChatInline text={line.slice(2)} /></span>
        </div>,
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1] ?? '1';
      nodes.push(
        <div key={nodes.length} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
          <span style={{ color: '#64b5ff', fontSize: 10, marginTop: 2, flexShrink: 0, minWidth: 12 }}>{num}.</span>
          <span><ChatInline text={line.slice(num.length + 2)} /></span>
        </div>,
      );
    } else if (line.trim() === '') {
      if (nodes.length > 0) nodes.push(<div key={nodes.length} style={{ height: 4 }} />);
    } else {
      nodes.push(<div key={nodes.length}><ChatInline text={line} /></div>);
    }
    i++;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>{nodes}</div>;
}

// ── GlobalChatPanel ───────────────────────────────────────────────────
const PANEL_WIDTH = 250;

export default function GlobalChatPanel() {
  const {
    messages, isLoading, sendMessage, startNewSession,
    activeSessionId, sessions, selectSession, deleteSession,
  } = useConversationStore();

  const [chatInput, setChatInput] = useState('');
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsHover, setTtsHover] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // TTS on assistant response complete
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && ttsEnabled) {
      const { messages: currentMessages } = useConversationStore.getState();
      const last = currentMessages[currentMessages.length - 1];
      if (last?.role === 'assistant' && last.content) {
        voiceService.playText(last.content).catch(console.error);
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, ttsEnabled]);

  const handleChatSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text || isLoading) return;
    sendMessage(text);
    setChatInput('');
  }, [chatInput, isLoading, sendMessage]);

  async function handleExportToObsidian() {
    if (!activeSessionId || messages.length === 0) return;
    try {
      const result = await conversationService.exportToObsidian(activeSessionId);
      setExportMsg(`✓ ${result.messageCount}개 저장됨`);
    } catch { setExportMsg('저장 실패'); }
    setTimeout(() => setExportMsg(''), 3000);
  }

  const { recording, interimText } = useVoiceInput({
    inputRef: chatInputRef,
    onTranscribed: (text) => setChatInput((prev) => prev ? `${prev} ${text}` : text),
    onAutoSend: (text) => sendMessage(text),
  });

  // Suppress unused warning — interimText shown via HoloJarvis recording color
  void interimText;

  return (
    <div style={{
      width: PANEL_WIDTH,
      flexShrink: 0,
      background: 'linear-gradient(180deg, #05050f 0%, #020208 100%)',
      borderLeft: '0.5px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── HoloJarvis section — top 50% ── */}
      <div style={{
        flex: '0 0 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #05050f 0%, #020208 100%)',
      }}>
        <HoloJarvis
          isRecording={recording}
          isSpeaking={isLoading}
          centerX={PANEL_WIDTH / 2}
          scale={1.0}
          sidebarWidth={PANEL_WIDTH}
          contained={true}
        />
      </div>

      {/* ── Chat section — bottom 50% ── */}
      <div style={{
        flex: '0 0 50%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderTop: '0.5px solid rgba(255,255,255,0.08)',
      }}>
        {/* ── Chat header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px 10px',
          flexShrink: 0,
          borderBottom: showSessionHistory ? 'none' : '1px solid rgba(84,84,88,0.25)',
          background: 'rgba(28,28,30,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>AIVIS</span>
            {activeSessionId && (
              <span style={{ color: 'rgba(156,163,175,0.5)', fontSize: 9, fontFamily: 'monospace' }}>
                #{activeSessionId.slice(-6)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {messages.length > 0 && activeSessionId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {exportMsg && (
                  <span style={{ fontSize: 9, color: '#34d399' }}>{exportMsg}</span>
                )}
                <button
                  onClick={handleExportToObsidian}
                  title="Obsidian Daily Note에 저장"
                  style={{
                    fontSize: 10, color: '#6b7280', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '2px 8px', borderRadius: 4,
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#34d399'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}
                >저장</button>
              </div>
            )}
            {sessions.length > 0 && (
              <button
                onClick={() => setShowSessionHistory((v) => !v)}
                style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4, border: 'none',
                  background: 'none', cursor: 'pointer',
                  color: showSessionHistory ? '#0a84ff' : '#6b7280',
                  transition: 'color 0.15s ease',
                }}
              >기록</button>
            )}
            <button
              onClick={() => { startNewSession(); setShowSessionHistory(false); }}
              style={{
                fontSize: 10, color: '#6b7280', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 8px', borderRadius: 4,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#d1d5db'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}
            >새 대화</button>
          </div>
        </div>

        {/* ── Session history panel ── */}
        {showSessionHistory && (
          <div style={{
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, #05050f 0%, #020208 100%)',
            maxHeight: 140,
            overflowY: 'auto',
          }}>
            {sessions.slice().reverse().map((s) => {
              const isActive = s.id === activeSessionId;
              const dateLabel = new Date(s.createdAt).toLocaleDateString('ko-KR', {
                month: 'short', day: 'numeric',
              });
              return (
                <div
                  key={s.id}
                  style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(84,84,88,0.25)' }}
                  className="group"
                >
                  <button
                    onClick={() => { selectSession(s.id); setShowSessionHistory(false); }}
                    style={{
                      flex: 1, textAlign: 'left', padding: '8px 12px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />}
                      <span style={{
                        fontSize: 10, color: isActive ? '#e2e8f0' : '#9ca3af',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>{s.title || '새 대화'}</span>
                      <span style={{ fontSize: 9, color: '#4b5563', flexShrink: 0 }}>{dateLabel}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    style={{
                      padding: '8px', fontSize: 9, color: '#374151', background: 'none', border: 'none',
                      cursor: 'pointer', transition: 'color 0.15s ease', opacity: 0,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = '#f87171';
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = '#374151';
                      (e.currentTarget as HTMLElement).style.opacity = '0';
                    }}
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Messages area ── */}
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 16px', gap: 16,
            overflowY: 'auto',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 16,
              background: 'rgba(10,132,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg style={{ width: 20, height: 20, color: '#60a5fa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#d1d5db', fontSize: 12, fontWeight: 500 }}>AIVIS에게 물어보세요</div>
              <div style={{ color: '#374151', fontSize: 10, marginTop: 4 }}>일정, 뉴스 요약, 작업 계획 등</div>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['오늘 일정 요약해줘', 'AI 뉴스 정리해줘', '이번 주 작업 계획 잡아줘'].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    width: '100%', textAlign: 'left', fontSize: 11, color: '#6b7280',
                    borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
                    background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(96,165,250,0.2)';
                    el.style.color = '#e2e8f0';
                    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(96,165,250,0.08)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.06)';
                    el.style.color = '#6b7280';
                    el.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ color: '#0a84ff', marginRight: 6 }}>→</span>{q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '86%',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '8px 12px',
                  fontSize: 11,
                  lineHeight: 1.6,
                  ...(msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)',
                    color: 'white',
                    boxShadow: '0 2px 12px rgba(10,132,255,0.28)',
                  } : {
                    background: 'linear-gradient(135deg, rgba(28,28,44,0.98) 0%, rgba(20,20,34,0.98) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(235,235,245,0.85)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }),
                }}>
                  {msg.content
                    ? msg.role === 'assistant'
                      ? <ChatMarkdown content={msg.content} />
                      : msg.content
                    : (
                      <span style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
                        {[0, 150, 300].map((d) => (
                          <span key={d} style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: '#0a84ff', opacity: 0.7,
                            animation: 'bounce 1s infinite',
                            animationDelay: `${d}ms`,
                          }} />
                        ))}
                      </span>
                    )
                  }
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ── Input area ── */}
        <div style={{
          flexShrink: 0, padding: '10px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, #05050f 0%, #020208 100%)',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              ref={chatInputRef}
              style={{
                flex: 1, borderRadius: 20, fontSize: 11,
                padding: '8px 14px',
                background: '#1c1c1e',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(235,235,245,0.9)',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(10,132,255,0.45)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.08), inset 0 0 0 1px rgba(10,132,255,0.12)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="메시지 (SPACE 길게: 음성)"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
              disabled={isLoading}
            />

            {/* TTS toggle */}
            <div
              style={{ position: 'relative', flexShrink: 0 }}
              onMouseEnter={() => setTtsHover(true)}
              onMouseLeave={() => setTtsHover(false)}
            >
              <button
                onClick={() => setTtsEnabled((v) => !v)}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', transition: 'background 0.15s ease',
                  background: ttsEnabled ? 'rgba(10,132,255,0.2)' : 'transparent',
                  color: ttsEnabled ? '#60a5fa' : '#6b7280',
                }}
              >
                <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeLinejoin="round" />
                  {ttsEnabled ? (
                    <>
                      <path strokeLinecap="round" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path strokeLinecap="round" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  ) : (
                    <>
                      <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" />
                      <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" />
                    </>
                  )}
                </svg>
              </button>
              {ttsHover && (
                <div style={{
                  position: 'absolute', bottom: '110%', left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  background: '#1c1c1e',
                  border: '1px solid rgba(84,84,88,0.35)',
                  borderRadius: 8,
                  padding: '5px 10px',
                  fontSize: 10,
                  color: '#9ca3af',
                  letterSpacing: 0.5,
                  pointerEvents: 'none',
                  zIndex: 50,
                }}>
                  {ttsEnabled ? 'AI 음성 켜짐 — 클릭해서 끄기' : 'AI 음성 꺼짐 — 클릭해서 켜기'}
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={handleChatSend}
              disabled={isLoading || !chatInput.trim()}
              style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: 10,
                background: '#2563eb', border: 'none', cursor: chatInput.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: isLoading || !chatInput.trim() ? 0.3 : 1,
                transition: 'opacity 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={e => { if (chatInput.trim() && !isLoading) (e.currentTarget as HTMLElement).style.background = '#1d4ed8'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#2563eb'; }}
            >
              <svg style={{ width: 14, height: 14, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
