export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  status: string;
  messages: Message[];
  createdAt: string;
}
