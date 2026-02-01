/**
 * 카테고리 API: 1뎁스(타입) + 2뎁스(항목)
 */

import { API_BASE } from './auth';

/** 1뎁스: 카테고리 타입 (성별/클래스/속성 등) */
export interface CategoryTypeItem {
  id: number;
  typeKey: string;
  name: string;
  sortOrder: number;
  isUsed: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTypeListResponse {
  success: boolean;
  total: number;
  types: CategoryTypeItem[];
}

/** 2뎁스: 카테고리 항목 */
export interface Category {
  id: number;
  typeId: number;
  typeKey: string;
  name: string;
  sortOrder: number;
  isUsed: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListResponse {
  success: boolean;
  total: number;
  categories: Category[];
}

/** 플로우/입력 파라미터용 공개 목록 (type_key별 name 배열) */
export interface CategoryPublicResponse {
  success: boolean;
  [typeKey: string]: boolean | string[];
}

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ---- 1뎁스(카테고리 타입) ----
/** 관리자: 1뎁스 목록 */
export async function listTypesAdmin(options?: {
  includeDeleted?: boolean;
}): Promise<CategoryTypeListResponse> {
  const params = new URLSearchParams();
  if (options?.includeDeleted !== undefined) params.set('include_deleted', String(options.includeDeleted));
  const url = `${API_BASE}/api/v1/categories/types/list?${params.toString()}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '타입 목록을 불러오지 못했습니다.');
  }
  return res.json();
}

/** 관리자: 1뎁스 생성 */
export async function createType(body: {
  type_key: string;
  name: string;
  sort_order?: number;
  is_used?: number;
}): Promise<CategoryTypeItem> {
  const res = await fetch(`${API_BASE}/api/v1/categories/types`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '타입 생성에 실패했습니다.');
  }
  return res.json();
}

/** 관리자: 1뎁스 수정 */
export async function updateType(
  id: number,
  body: { type_key?: string; name?: string; sort_order?: number; is_used?: number }
): Promise<CategoryTypeItem> {
  const res = await fetch(`${API_BASE}/api/v1/categories/types/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '타입 수정에 실패했습니다.');
  }
  return res.json();
}

/** 관리자: 1뎁스 소프트 삭제 */
export async function softDeleteType(id: number): Promise<CategoryTypeItem> {
  const res = await fetch(`${API_BASE}/api/v1/categories/types/${id}/soft-delete`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '타입 삭제에 실패했습니다.');
  }
  return res.json();
}

/** 관리자: 1뎁스 복원 */
export async function restoreType(id: number): Promise<CategoryTypeItem> {
  const res = await fetch(`${API_BASE}/api/v1/categories/types/${id}/restore`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '타입 복원에 실패했습니다.');
  }
  return res.json();
}

// ---- 2뎁스(카테고리 항목) ----
/** 관리자: 2뎁스 목록 (type_id 필터 옵션) */
export async function listCategoriesAdmin(options?: {
  type_id?: number;
  includeDeleted?: boolean;
}): Promise<CategoryListResponse> {
  const params = new URLSearchParams();
  if (options?.type_id != null) params.set('type_id', String(options.type_id));
  if (options?.includeDeleted !== undefined) params.set('include_deleted', String(options.includeDeleted));
  const url = `${API_BASE}/api/v1/categories/list?${params.toString()}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '카테고리 목록을 불러오지 못했습니다.');
  }
  return res.json();
}

/** 플로우용: 사용중·미삭제 카테고리만 (공개) */
export async function listCategoriesPublic(): Promise<CategoryPublicResponse> {
  const res = await fetch(`${API_BASE}/api/v1/categories/list/public`);
  if (!res.ok) throw new Error('카테고리 목록을 불러오지 못했습니다.');
  return res.json();
}

/** 관리자: 2뎁스 생성 */
export async function createCategory(body: {
  type_id: number;
  name: string;
  sort_order?: number;
  is_used?: number;
}): Promise<Category> {
  const res = await fetch(`${API_BASE}/api/v1/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '생성에 실패했습니다.');
  }
  return res.json();
}

/** 관리자: 2뎁스 수정 */
export async function updateCategory(
  id: number,
  body: { name?: string; sort_order?: number; is_used?: number }
): Promise<Category> {
  const res = await fetch(`${API_BASE}/api/v1/categories/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '수정에 실패했습니다.');
  }
  return res.json();
}

/** 관리자: 2뎁스 소프트 삭제 */
export async function softDeleteCategory(id: number): Promise<Category> {
  const res = await fetch(`${API_BASE}/api/v1/categories/${id}/soft-delete`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '삭제에 실패했습니다.');
  }
  return res.json();
}

/** 관리자: 2뎁스 복원 */
export async function restoreCategory(id: number): Promise<Category> {
  const res = await fetch(`${API_BASE}/api/v1/categories/${id}/restore`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '복원에 실패했습니다.');
  }
  return res.json();
}
