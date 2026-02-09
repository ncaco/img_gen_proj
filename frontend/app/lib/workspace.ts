/**
 * 워크스페이스·플로우 API
 */
import { API_BASE } from '@/app/lib/auth';

export interface WorkspaceItem {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowItem {
  id: number;
  workspaceId: number;
  name: string;
  flowData: { nodes?: unknown[]; edges?: unknown[] } | null;
  lastAccessedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function listWorkspaces(): Promise<{ success: boolean; total: number; workspaces: WorkspaceItem[] }> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces`, { headers: authHeaders() });
  if (!res.ok) throw new Error('워크스페이스 목록을 불러올 수 없습니다.');
  return res.json();
}

export async function createWorkspace(name: string): Promise<WorkspaceItem> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '워크스페이스 생성에 실패했습니다.');
  }
  return res.json();
}

export async function deleteWorkspace(workspaceId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '워크스페이스 삭제에 실패했습니다.');
  }
}

/** 워크스페이스 이름 수정 */
export async function updateWorkspace(workspaceId: number, name: string): Promise<WorkspaceItem> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '워크스페이스 이름 수정에 실패했습니다.');
  }
  return res.json();
}

export async function listFlows(workspaceId: number): Promise<{ success: boolean; total: number; flows: FlowItem[] }> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}/flows`, { headers: authHeaders() });
  if (!res.ok) throw new Error('플로우 목록을 불러올 수 없습니다.');
  return res.json();
}

export async function createFlow(workspaceId: number, name?: string): Promise<FlowItem> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}/flows`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '플로우 생성에 실패했습니다.');
  }
  return res.json();
}

export async function getFlow(workspaceId: number, flowId: number): Promise<FlowItem> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}/flows/${flowId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('플로우를 불러올 수 없습니다.');
  return res.json();
}

export async function updateFlow(
  workspaceId: number,
  flowId: number,
  data: { name?: string; flowData?: { nodes: unknown[]; edges: unknown[] } }
): Promise<FlowItem> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}/flows/${flowId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('플로우 저장에 실패했습니다.');
  return res.json();
}

export async function deleteFlow(workspaceId: number, flowId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}/flows/${flowId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '플로우 삭제에 실패했습니다.');
  }
}

export async function getLatestFlow(workspaceId: number): Promise<FlowItem> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}/flows/latest`, { headers: authHeaders() });
  if (!res.ok) throw new Error('최근 플로우를 불러올 수 없습니다.');
  return res.json();
}

export interface CardItem {
  cardSn: number;
  cardNumber?: string;
  cardName: string;
  type: string;
  attribute: string;
  rarity: string;
  gender?: string;
  attack: string;
  health: string;
  skill1Name?: string;
  skill1Description?: string;
  skill2Name?: string;
  skill2Description?: string;
  flavorText?: string;
  series?: string;
  characterImageUrl?: string;
  backgroundImageUrl?: string;
  generatedPrompt?: string;
  negativePrompt?: string;
  generatedImageUrl?: string;
  draftImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardListResponse {
  success: boolean;
  total: number;
  cards: CardItem[];
}

/** 카드 목록 조회 (필터링 지원). */
export async function listCards(params?: {
  skip?: number;
  limit?: number;
  characterId?: number;
  gender?: string;
  attribute?: string;
  type?: string;
}): Promise<CardListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip != null) searchParams.set('skip', String(params.skip));
  if (params?.limit != null) searchParams.set('limit', String(params.limit));
  if (params?.characterId != null) searchParams.set('character_id', String(params.characterId));
  if (params?.gender != null) searchParams.set('gender', params.gender);
  if (params?.attribute != null) searchParams.set('attribute', params.attribute);
  if (params?.type != null) searchParams.set('type', params.type);

  const res = await fetch(`${API_BASE}/api/v1/cards/list?${searchParams.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '카드 목록을 불러올 수 없습니다.');
  }
  return res.json();
}
