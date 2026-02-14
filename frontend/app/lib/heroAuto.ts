/**
 * 영웅 풀오토(10각형 서번트 자동 배분) API 클라이언트
 */
import { API_BASE } from './auth';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ServantSlot {
  position: number;
  gender: string;
  attribute?: string | null;
  type?: string | null;
}

export interface HeroAutoPool {
  id: number;
  characterId: number;
  servants: ServantSlot[];
  isConfirmed: boolean;
}

export interface HeroAutoPoolCreateRequest {
  characterId: number;
}

export interface HeroAutoDistributeRequest {
  attributeStartGender?: string;
  classStartGender?: string;
}

export interface HeroAutoDistributeResponse {
  success: boolean;
  pool: HeroAutoPool;
}

export interface HeroAutoConfirmResponse {
  success: boolean;
  pool: HeroAutoPool;
}

export interface HeroAutoPoolListItem {
  id: number;
  characterId: number;
  characterName: string | null;
  isConfirmed: boolean;
}

/** 영웅 풀오토 풀 목록 조회 (사이드바용) */
export async function listHeroAutoPools(): Promise<HeroAutoPoolListItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/hero-auto`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '풀 목록을 불러오지 못했습니다.');
  }
  return res.json();
}

/** 영웅 풀오토 풀 생성 */
export async function createHeroAutoPool(
  body: HeroAutoPoolCreateRequest,
): Promise<HeroAutoPool> {
  const res = await fetch(`${API_BASE}/api/v1/hero-auto`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      characterId: body.characterId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '영웅 풀오토 풀 생성에 실패했습니다.');
  }
  return res.json();
}

/** 영웅 풀오토 풀 조회 */
export async function getHeroAutoPool(poolId: number): Promise<HeroAutoPool> {
  const res = await fetch(`${API_BASE}/api/v1/hero-auto/${poolId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '영웅 풀오토 정보를 불러오지 못했습니다.');
  }
  return res.json();
}

/** 속성/클래스 자동 배분 실행 */
export async function distributeHeroAutoPool(
  poolId: number,
  body?: HeroAutoDistributeRequest,
): Promise<HeroAutoDistributeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/hero-auto/${poolId}/distribute`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      attributeStartGender: body?.attributeStartGender ?? '남성',
      classStartGender: body?.classStartGender ?? '여성',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '자동 배분에 실패했습니다.');
  }
  return res.json();
}

/** 풀오토 결과 확정 */
export async function confirmHeroAutoPool(poolId: number): Promise<HeroAutoConfirmResponse> {
  const res = await fetch(`${API_BASE}/api/v1/hero-auto/${poolId}/confirm`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '풀오토 확정에 실패했습니다.');
  }
  return res.json();
}

/** 풀오토 결과 재생성(초기화) */
export async function regenerateHeroAutoPool(
  poolId: number,
): Promise<HeroAutoConfirmResponse> {
  const res = await fetch(`${API_BASE}/api/v1/hero-auto/${poolId}/regenerate`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '풀오토 재생성에 실패했습니다.');
  }
  return res.json();
}

/** 풀오토 풀 삭제 (목록에서만 제거) */
export async function deleteHeroAutoPool(poolId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/hero-auto/${poolId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '풀오토 삭제에 실패했습니다.');
  }
}


