import { create } from 'zustand';
import { conversationService } from '../services/conversationService';
import type { Message, Session } from '../types';

interface ConversationState {
  sessions: Session[];
  activeSessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  loadSessions: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  startNewSession: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isLoading: false,

  async loadSessions() {
    const sessions = await conversationService.listSessions();
    set({ sessions });
  },

  async selectSession(sessionId: string) {
    const session = await conversationService.getSession(sessionId);
    set({ activeSessionId: sessionId, messages: session.messages });
  },

  async sendMessage(text: string) {
    const { activeSessionId } = get();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    const streamingId = crypto.randomUUID();
    const streamingMessage: Message = {
      id: streamingId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    set((s) => ({ messages: [...s.messages, userMessage, streamingMessage], isLoading: true }));

    try {
      let sessionId = activeSessionId;

      if (!sessionId) {
        const session = await conversationService.createSession();
        sessionId = session.id;
        set((s) => ({ activeSessionId: sessionId, sessions: [session, ...s.sessions] }));
      }

      const finalMessage = await conversationService.streamMessage(
        sessionId,
        text,
        (delta) => {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === streamingId
                ? { ...m, content: m.content.startsWith('⚙️') ? delta : m.content + delta }
                : m,
            ),
          }));
        },
        (display) => {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === streamingId ? { ...m, content: display } : m,
            ),
          }));
        },
      );

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === streamingId
            ? { ...m, id: finalMessage.id, createdAt: finalMessage.createdAt }
            : m,
        ),
      }));
    } catch (err) {
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== userMessage.id && m.id !== streamingId),
      }));
      console.error('Failed to send message:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  startNewSession() {
    set({ activeSessionId: null, messages: [] });
  },

  async deleteSession(sessionId: string) {
    await conversationService.deleteSession(sessionId);
    set((s) => ({
      sessions: s.sessions.filter((s) => s.id !== sessionId),
      ...(s.activeSessionId === sessionId ? { activeSessionId: null, messages: [] } : {}),
    }));
  },
}));
