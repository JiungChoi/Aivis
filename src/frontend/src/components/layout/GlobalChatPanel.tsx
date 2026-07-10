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
              background: 'rgba(0,0,0,0.35)', borderRadius: 'var(--r-sm)',
              padding: '1px 4px', fontSize: '0.88em',
              fontFamily: 'ui-monospace, monospace', color: 'var(--accent)',
            }}>{p.slice(1, -1)}</code>
          );
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
          return <em key={i} style={{ color: 'var(--text-2)' }}>{p.slice(1, -1)}</em>;
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
          background: 'rgba(0,0,0,0.35)', borderRadius: 'var(--r-sm)', padding: '8px 10px',
          fontSize: 11, color: 'var(--accent)', overflowX: 'auto',
          fontFamily: 'ui-monospace, monospace', lineHeight: 1.55, margin: '3px 0',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
    } else if (line.startsWith('### ') || line.startsWith('## ')) {
      const lvl = line.startsWith('### ') ? 4 : 3;
      nodes.push(
        <div key={nodes.length} style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 12, marginTop: 5 }}>
          <ChatInline text={line.slice(lvl)} />
        </div>,
      );
    } else if (/^[-*] /.test(line)) {
      nodes.push(
        <div key={nodes.length} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent)', fontSize: 11, marginTop: 2, flexShrink: 0 }}>•</span>
          <span><ChatInline text={line.slice(2)} /></span>
        </div>,
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1] ?? '1';
      nodes.push(
        <div key={nodes.length} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent)', fontSize: 11, marginTop: 2, flexShrink: 0, minWidth: 12 }}>{num}.</span>
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
      background: 'var(--bg-0)',
      borderLeft: '1px solid var(--border-1)',
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
        background: 'var(--bg-0)',
      }}>
        <HoloJarvis
          isRecording={recording}
          isSpeaking={isLoading}
          centerX={PANEL_WIDTH / 2}
          scale={1.0}
          sidebarWidth={PANEL_WIDTH}
          contained={true}
        />

        {/* ── AIVIS 명찰 ── */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 12px',
          borderRadius: 'var(--r-full)',
          background: 'var(--bg-3)',
          border: '1px solid var(--border-2)',
          pointerEvents: 'none',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 'var(--r-full)',
            background: recording ? 'var(--danger)' : 'var(--ok)',
            animation: 'live-dot 2s var(--ease) infinite',
          }} />
          <span style={{
            color: 'var(--text-1)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
          }}>AIVIS</span>
          <span style={{ color: 'var(--text-3)', fontSize: 11 }}>호스트 AI</span>
        </div>
      </div>

      {/* ── Chat section — bottom 50% ── */}
      <div style={{
        flex: '0 0 50%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderTop: '1px solid var(--border-1)',
      }}>
        {/* ── Chat header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px 10px',
          flexShrink: 0,
          borderBottom: showSessionHistory ? 'none' : '1px solid var(--border-1)',
          background: 'var(--bg-1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 'var(--r-full)', background: 'var(--ok)' }} />
            {activeSessionId && (
              <span className="tabular" style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
                #{activeSessionId.slice(-6)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {messages.length > 0 && activeSessionId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {exportMsg && (
                  <span style={{ fontSize: 11, color: 'var(--ok)' }}>{exportMsg}</span>
                )}
                <button
                  onClick={handleExportToObsidian}
                  title="Obsidian Daily Note에 저장"
                  style={{
                    fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '2px 8px', borderRadius: 'var(--r-sm)',
                    transition: 'color var(--dur-1) var(--ease)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
                >저장</button>
              </div>
            )}
            {sessions.length > 0 && (
              <button
                onClick={() => setShowSessionHistory((v) => !v)}
                style={{
                  fontSize: 12, padding: '2px 8px', borderRadius: 'var(--r-sm)', border: 'none',
                  background: 'none', cursor: 'pointer',
                  color: showSessionHistory ? 'var(--accent)' : 'var(--text-3)',
                  transition: 'color var(--dur-1) var(--ease)',
                }}
              >기록</button>
            )}
            <button
              onClick={() => { startNewSession(); setShowSessionHistory(false); }}
              style={{
                fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 8px', borderRadius: 'var(--r-sm)',
                transition: 'color var(--dur-1) var(--ease)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
            >새 대화</button>
          </div>
        </div>

        {/* ── Session history panel ── */}
        {showSessionHistory && (
          <div style={{
            flexShrink: 0,
            borderBottom: '1px solid var(--border-1)',
            background: 'var(--bg-1)',
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
                  style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-1)' }}
                  className="group"
                >
                  <button
                    onClick={() => { selectSession(s.id); setShowSessionHistory(false); }}
                    style={{
                      flex: 1, textAlign: 'left', padding: '8px 12px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      transition: 'background var(--dur-1) var(--ease)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      {isActive && <div style={{ width: 4, height: 4, borderRadius: 'var(--r-full)', background: 'var(--accent)', flexShrink: 0 }} />}
                      <span style={{
                        fontSize: 12, color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>{s.title || '새 대화'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{dateLabel}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    style={{
                      padding: '8px', fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none',
                      cursor: 'pointer', transition: 'color var(--dur-1) var(--ease)', opacity: 0,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
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
              width: 40, height: 40, borderRadius: 'var(--r-md)',
              background: 'var(--accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg style={{ width: 20, height: 20, color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 500 }}>AIVIS에게 물어보세요</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>일정, 뉴스 요약, 작업 계획 등</div>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['오늘 일정 요약해줘', 'AI 뉴스 정리해줘', '이번 주 작업 계획 잡아줘'].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    width: '100%', textAlign: 'left', fontSize: 12, color: 'var(--text-2)',
                    borderRadius: 'var(--r-sm)', padding: '8px 12px', cursor: 'pointer',
                    background: 'var(--bg-2)', border: '1px solid var(--border-1)',
                    transition: 'border-color var(--dur-2) var(--ease), background var(--dur-2) var(--ease)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'var(--border-2)';
                    el.style.background = 'var(--bg-3)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'var(--border-1)';
                    el.style.background = 'var(--bg-2)';
                  }}
                >
                  <span style={{ color: 'var(--accent)', marginRight: 6 }}>→</span>{q}
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
                  borderRadius: msg.role === 'user'
                    ? 'var(--r-md) var(--r-md) var(--r-sm) var(--r-md)'
                    : 'var(--r-md) var(--r-md) var(--r-md) var(--r-sm)',
                  padding: '8px 12px',
                  fontSize: 12,
                  lineHeight: 1.6,
                  ...(msg.role === 'user' ? {
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                  } : {
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-1)',
                    color: 'var(--text-1)',
                  }),
                }}>
                  {msg.content
                    ? msg.role === 'assistant'
                      ? <ChatMarkdown content={msg.content} />
                      : msg.content
                    : (
                      <span style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
                        {[0, 200, 400].map((d) => (
                          <span key={d} style={{
                            width: 5, height: 5, borderRadius: 'var(--r-full)',
                            background: 'var(--accent)',
                            animation: 'live-dot 1.2s var(--ease) infinite',
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
          borderTop: '1px solid var(--border-1)',
          background: 'var(--bg-1)',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              ref={chatInputRef}
              style={{
                flex: 1, borderRadius: 'var(--r-sm)', fontSize: 12,
                padding: '8px 12px',
                background: 'var(--bg-sunken)',
                border: '1px solid var(--border-1)',
                color: 'var(--text-1)',
                outline: 'none',
                transition: 'border-color var(--dur-2) var(--ease), box-shadow var(--dur-2) var(--ease)',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent-border)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-bg)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border-1)';
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
                  width: 32, height: 32, borderRadius: 'var(--r-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid transparent', cursor: 'pointer', transition: 'background var(--dur-2) var(--ease)',
                  background: ttsEnabled ? 'var(--accent-bg)' : 'transparent',
                  color: ttsEnabled ? 'var(--accent)' : 'var(--text-3)',
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
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--r-sm)',
                  padding: '5px 10px',
                  fontSize: 11,
                  color: 'var(--text-2)',
                  boxShadow: 'var(--shadow-overlay)',
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
                flexShrink: 0, width: 32, height: 32, borderRadius: 'var(--r-sm)',
                background: 'var(--accent)', border: 'none', cursor: chatInput.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: isLoading || !chatInput.trim() ? 0.45 : 1,
                transition: 'opacity var(--dur-2) var(--ease), background var(--dur-2) var(--ease)',
              }}
              onMouseEnter={e => { if (chatInput.trim() && !isLoading) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
            >
              <svg style={{ width: 14, height: 14, color: 'var(--on-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
