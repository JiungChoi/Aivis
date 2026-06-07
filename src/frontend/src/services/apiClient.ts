import { API_BASE } from '../config';

const USER_ID_KEY = 'aivis_user_id';

export function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

/**
 * Low-level fetch wrapper. Prepends API_BASE to relative paths and always
 * attaches the X-User-Id header. Use this for non-JSON cases (streaming,
 * FormData, binary). For JSON endpoints prefer apiGet/apiPost/apiPut/apiDelete.
 */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('X-User-Id', getUserId());
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return fetch(url, { ...options, headers });
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

/**
 * JSON request helper. Returns the `data` field of the standard
 * `{ success, data, message }` envelope, throwing on HTTP or API errors.
 * Pass `errorMessage` to surface a domain-specific message to the user.
 */
async function request<T>(path: string, options: RequestInit, errorMessage?: string): Promise<T> {
  const res = await apiFetch(path, options);
  let json: ApiEnvelope<T> | null = null;
  try { json = await res.json() as ApiEnvelope<T>; } catch { /* empty body */ }

  if (!res.ok || (json && json.success === false)) {
    throw new Error(errorMessage ?? json?.message ?? `API error: ${res.status}`);
  }
  return (json?.data ?? (json as unknown)) as T;
}

const jsonBody = (body: unknown): RequestInit =>
  body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };

export const apiGet = <T>(path: string, errorMessage?: string): Promise<T> =>
  request<T>(path, {}, errorMessage);

export const apiPost = <T>(path: string, body?: unknown, errorMessage?: string): Promise<T> =>
  request<T>(path, { method: 'POST', ...jsonBody(body) }, errorMessage);

export const apiPut = <T>(path: string, body?: unknown, errorMessage?: string): Promise<T> =>
  request<T>(path, { method: 'PUT', ...jsonBody(body) }, errorMessage);

export const apiDelete = (path: string, errorMessage?: string): Promise<void> =>
  request<void>(path, { method: 'DELETE' }, errorMessage);
