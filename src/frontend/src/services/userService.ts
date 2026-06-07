import { apiGet, apiPost, apiPut, getUserId } from './apiClient';

const BASE = '/api/users';

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

function cacheProfile(profile: UserProfile): UserProfile {
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  return profile;
}

export const userService = {
  getUserId,

  async initUser(): Promise<UserProfile> {
    const cached = loadCachedProfile();
    const profile = await apiPost<UserProfile>(`${BASE}/init`, {
      name:   cached.name   || '사용자',
      email:  cached.email  || '',
      gender: cached.gender || '미설정',
    }, 'User init failed');
    return cacheProfile(profile);
  },

  getProfile: () => apiGet<UserProfile>(`${BASE}/me`, '프로필 로드 실패'),

  async updateProfile(updates: { name?: string; email?: string; gender?: string; tone?: string; language?: string }): Promise<UserProfile> {
    const profile = await apiPut<UserProfile>(`${BASE}/me`, updates, '프로필 저장 실패');
    return cacheProfile(profile);
  },
};
