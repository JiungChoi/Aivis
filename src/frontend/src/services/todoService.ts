import { apiFetch } from './apiClient';

const BASE = 'http://localhost:5050/api/todos';

export type TodoPriority = 'low' | 'normal' | 'high';

export interface TodoItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  priority: TodoPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoPayload {
  title: string;
  description?: string;
  priority?: TodoPriority;
  dueDate?: string;
}

export interface UpdateTodoPayload extends CreateTodoPayload {
  isCompleted?: boolean;
}

export const todoService = {
  async list(): Promise<TodoItem[]> {
    const res = await apiFetch(BASE);
    if (!res.ok) throw new Error('할 일 로드 실패');
    const json = await res.json();
    return json.data as TodoItem[];
  },

  async create(payload: CreateTodoPayload): Promise<TodoItem> {
    const res = await apiFetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, priority: payload.priority ?? 'normal' }),
    });
    if (!res.ok) throw new Error('할 일 생성 실패');
    return (await res.json()).data as TodoItem;
  },

  async update(id: string, payload: UpdateTodoPayload): Promise<TodoItem> {
    const res = await apiFetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('할 일 수정 실패');
    return (await res.json()).data as TodoItem;
  },

  async toggle(item: TodoItem): Promise<TodoItem> {
    return todoService.update(item.id, {
      title: item.title,
      description: item.description,
      priority: item.priority,
      dueDate: item.dueDate,
      isCompleted: !item.isCompleted,
    });
  },

  async remove(id: string): Promise<void> {
    const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('할 일 삭제 실패');
  },
};
