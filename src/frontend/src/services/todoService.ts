import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

const BASE = '/api/todos';

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
  list: () => apiGet<TodoItem[]>(BASE, '할 일 로드 실패'),

  create: (payload: CreateTodoPayload) =>
    apiPost<TodoItem>(BASE, { ...payload, priority: payload.priority ?? 'normal' }, '할 일 생성 실패'),

  update: (id: string, payload: UpdateTodoPayload) =>
    apiPut<TodoItem>(`${BASE}/${id}`, payload, '할 일 수정 실패'),

  toggle: (item: TodoItem) =>
    todoService.update(item.id, {
      title: item.title,
      description: item.description,
      priority: item.priority,
      dueDate: item.dueDate,
      isCompleted: !item.isCompleted,
    }),

  remove: (id: string) => apiDelete(`${BASE}/${id}`, '할 일 삭제 실패'),
};
