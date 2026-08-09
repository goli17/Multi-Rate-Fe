const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'mrp_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && options.body !== null) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const raw = data?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : raw || res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  signup: (email: string, password: string) =>
    request<{
      requiresVerification?: boolean;
      email?: string;
      message?: string;
      accessToken?: string;
      user?: { id: string; email: string };
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  verifyOtp: (email: string, code: string) =>
    request<{ accessToken: string; user: { id: string; email: string } }>(
      '/auth/verify-otp',
      { method: 'POST', body: JSON.stringify({ email, code }) },
    ),
  resendOtp: (email: string) =>
    request<{ requiresVerification: boolean; email: string; message: string }>(
      '/auth/resend-otp',
      { method: 'POST', body: JSON.stringify({ email }) },
    ),
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: { id: string; email: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  listDocuments: () => request<import('./types').DocumentSummary[]>('/documents'),
  getDocument: (id: string) =>
    request<import('./types').Document>(`/documents/${id}`),
  createDocument: (body: unknown) =>
    request<import('./types').Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateDocument: (id: string, body: unknown) =>
    request<import('./types').Document>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteDocument: (id: string) =>
    request<{ deleted: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
  finalizeDocument: (id: string) =>
    request<import('./types').Document>(`/documents/${id}/finalize`, {
      method: 'POST',
    }),
  addLine: (id: string, body: unknown) =>
    request<import('./types').Document>(`/documents/${id}/lines`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateLine: (id: string, lineId: string, body: unknown) =>
    request<import('./types').Document>(`/documents/${id}/lines/${lineId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  removeLine: (id: string, lineId: string) =>
    request<import('./types').Document>(`/documents/${id}/lines/${lineId}`, {
      method: 'DELETE',
    }),
  summary: (from: string, to: string, currency: string) =>
    request<import('./types').SummaryReport>(
      `/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&currency=${encodeURIComponent(currency)}`,
    ),
};
