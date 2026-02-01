/**
 * 인증 API 및 토큰 관리
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';
const AUTH_TOKEN_KEY = 'auth_token';

export interface User {
  id: number;
  email: string;
  display_name: string | null;
  is_admin: boolean;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token === null) localStorage.removeItem(AUTH_TOKEN_KEY);
  else localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function fetchMe(token: string): Promise<User | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    id: data.id,
    email: data.email,
    display_name: data.display_name ?? null,
    is_admin: Boolean(data.is_admin),
  };
}

export async function login(email: string, password: string): Promise<{ access_token: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '로그인에 실패했습니다.');
  }
  return res.json();
}

export async function register(
  email: string,
  password: string,
  display_name?: string
): Promise<User> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: display_name || null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '회원가입에 실패했습니다.');
  }
  return res.json();
}

export function dispatchAuthChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-change'));
}
