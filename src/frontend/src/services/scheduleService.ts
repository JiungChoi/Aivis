import { apiFetch } from './apiClient';

const BASE = 'http://localhost:5050/api/schedules';

export type ScheduleCategory = 'Meeting' | 'Work' | 'CodeReview' | 'Rest' | 'Personal' | 'Other';

export const SCHEDULE_CATEGORIES: { value: ScheduleCategory; label: string }[] = [
  { value: 'Meeting',    label: '미팅' },
  { value: 'Work',       label: '작업' },
  { value: 'CodeReview', label: '코드리뷰' },
  { value: 'Rest',       label: '휴식' },
  { value: 'Personal',   label: '개인' },
  { value: 'Other',      label: '기타' },
];

export interface ScheduleItem {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  title: string;
  description?: string;
  category: ScheduleCategory;
  tag: string;
}

export interface CreateSchedulePayload {
  date: string;
  startTime: string;
  endTime?: string;
  title: string;
  description?: string;
  category: ScheduleCategory;
  tag?: string;
}

export const scheduleService = {
  async getByDate(date: string): Promise<ScheduleItem[]> {
    const res = await apiFetch(`${BASE}?date=${date}`);
    if (!res.ok) throw new Error('일정 로드 실패');
    const json = await res.json();
    return json.data as ScheduleItem[];
  },

  async getUpcomingReminders(withinMinutes = 10): Promise<ScheduleItem[]> {
    const res = await apiFetch(`${BASE}/reminders/upcoming?withinMinutes=${withinMinutes}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data as ScheduleItem[];
  },

  async create(payload: CreateSchedulePayload): Promise<ScheduleItem> {
    const res = await apiFetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('일정 생성 실패');
    const json = await res.json();
    return json.data as ScheduleItem;
  },

  async update(id: string, payload: CreateSchedulePayload): Promise<ScheduleItem> {
    const res = await apiFetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('일정 수정 실패');
    const json = await res.json();
    return json.data as ScheduleItem;
  },

  async remove(id: string): Promise<void> {
    const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('일정 삭제 실패');
  },
};
