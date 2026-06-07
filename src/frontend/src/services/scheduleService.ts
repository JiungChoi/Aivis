import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

const BASE = '/api/schedules';

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
  getByDate: (date: string) =>
    apiGet<ScheduleItem[]>(`${BASE}?date=${date}`, '일정 로드 실패'),

  getUpcomingReminders: (withinMinutes = 10) =>
    apiGet<ScheduleItem[]>(`${BASE}/reminders/upcoming?withinMinutes=${withinMinutes}`)
      .catch(() => [] as ScheduleItem[]),

  create: (payload: CreateSchedulePayload) =>
    apiPost<ScheduleItem>(BASE, payload, '일정 생성 실패'),

  update: (id: string, payload: CreateSchedulePayload) =>
    apiPut<ScheduleItem>(`${BASE}/${id}`, payload, '일정 수정 실패'),

  remove: (id: string) =>
    apiDelete(`${BASE}/${id}`, '일정 삭제 실패'),
};
