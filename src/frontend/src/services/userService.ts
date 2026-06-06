import { apiFetch, getUserId } from './apiClient';

const BASE = 'http://localhost:5050/api/users';

export interface UserProfile {
  id: string;
  name: string;
  gender: string;
  email: string;
  language: string;
  tone: string;
}

const PROFILE_CACHE_KEY = 'aivis_user_profile';

function loadCachedProfile(): Partial<UserProfile> {
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}'); } catch { return {}; }
}

export const userService = {
  getUserId,

  async initUser(): Promise<UserProfile> {
    const cached = loadCachedProfile();
    const res = await apiFetch(`${BASE}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:   cached.name   || '사용자',
        email:  cached.email  || '',
        gender: cached.gender || '미설정',
      }),
    });
    if (!res.ok) throw new Error('User init failed');
    const json = await res.json();
    const profile = json.data as UserProfile;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    return profile;
  },

  async getProfile(): Promise<UserProfile> {
    const res = await apiFetch(`${BASE}/me`);
    if (!res.ok) throw new Error('프로필 로드 실패');
    const json = await res.json();
    return json.data as UserProfile;
  },

  async updateProfile(updates: { name?: string; email?: string; gender?: string; tone?: string }): Promise<UserProfile> {
    const res = await apiFetch(`${BASE}/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('프로필 저장 실패');
    const json = await res.json();
    const profile = json.data as UserProfile;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    return profile;
  },
};
