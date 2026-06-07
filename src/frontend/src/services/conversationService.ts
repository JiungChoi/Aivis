import type { Message, Session } from '../types';
import { apiFetch } from './apiClient';

const BASE_URL = 'http://localhost:5050/api/conversations';

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message ?? `API error: ${res.status}`);
  return json.data as T;
}

function normalizeMessage(raw: Record<string, unknown>): Message {
  return {
    id: raw.id as string,
    role: (raw.role as string).toLowerCase() as Message['role'],
    content: raw.content as string,
    createdAt: raw.createdAt as string,
  };
}

function normalizeSession(raw: Record<string, unknown>): Session {
  const messages = (raw.messages as Record<string, unknown>[]) ?? [];
  return {
    id: raw.id as string,
    userId: raw.userId as string,
    title: (raw.title as string | undefined) ?? '새 대화',
    status: raw.status as string,
    messages: messages.map(normalizeMessage),
    createdAt: raw.createdAt as string,
  };
}

export const conversationService = {
  async listSessions(): Promise<Session[]> {
    const res = await apiFetch(BASE_URL);
    const data = await parseResponse<Record<string, unknown>[]>(res);
    return data.map(normalizeSession);
  },

  async createSession(): Promise<Session> {
    const res = await apiFetch(BASE_URL, { method: 'POST' });
    const data = await parseResponse<Record<string, unknown>>(res);
    return normalizeSession(data);
  },

  async getSession(sessionId: string): Promise<Session> {
    const res = await apiFetch(`${BASE_URL}/${sessionId}`);
    const data = await parseResponse<Record<string, unknown>>(res);
    return normalizeSession(data);
  },

  async sendMessage(sessionId: string, content: string): Promise<Message> {
    const res = await apiFetch(`${BASE_URL}/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await parseResponse<Record<string, unknown>>(res);
    return normalizeMessage(data);
  },

  streamMessage(
    sessionId: string,
    content: string,
    onDelta: (delta: string) => void,
    onToolCall?: (display: string) => void,
  ): Promise<Message> {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await apiFetch(`${BASE_URL}/${sessionId}/messages/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (!res.ok || !res.body) {
          reject(new Error(`Stream error: ${res.status}`));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = JSON.parse(line.slice(6));

            if (payload.done) {
              resolve({
                id: payload.messageId,
                role: 'assistant',
                content: '',
                createdAt: payload.createdAt,
              });
              return;
            }

            if (payload.delta) onDelta(payload.delta);
            if (payload.tool_call && onToolCall) onToolCall(payload.display ?? payload.tool_call);
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    await apiFetch(`${BASE_URL}/${sessionId}`, { method: 'DELETE' });
  },

  async exportToObsidian(sessionId: string): Promise<{ messageCount: number }> {
    const res = await apiFetch(`${BASE_URL}/${sessionId}/export`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? '저장 실패');
    return json.data as { messageCount: number };
  },
};
