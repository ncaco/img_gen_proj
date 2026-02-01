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

export async function listFlows(workspaceId: number): Promise<{ success: boolean; total: number; flows: FlowItem[] }> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceId}/flows`, { headers: authHeaders() });
  if (!res.ok) throw new Error('플로우 목록을 불러올 수 없습니다.');
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
