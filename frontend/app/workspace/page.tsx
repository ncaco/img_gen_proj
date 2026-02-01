'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listWorkspaces, createWorkspace, deleteWorkspace, listFlows, type WorkspaceItem } from '@/app/lib/workspace';
import { getStoredToken } from '@/app/lib/auth';
import ConfirmModal from '@/app/components/ConfirmModal';
import LoadingMask from '@/app/components/LoadingMask';

export default function WorkspacePage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    listWorkspaces()
      .then((data) => {
        setWorkspaces(data.workspaces ?? []);
      })
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreateWorkspace = async () => {
    setError(null);
    setCreating(true);
    try {
      const w = await createWorkspace('새 워크스페이스');
      const flowsRes = await listFlows(w.id);
      const flows = flowsRes.flows ?? [];
      setWorkspaces((prev) => [w, ...prev]);
      if (flows.length > 0) {
        router.push(`/workspace/${w.id}/flow/${flows[0].id}`);
      } else {
        router.push(`/workspace/${w.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '워크스페이스 생성에 실패했습니다.');
      setCreating(false);
    }
    // 성공 시 플로우로 이동하므로 creating은 그대로 두어 마스크 유지(언마운트 시 사라짐)
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkspace(deleteTarget.id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '워크스페이스 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-white">
      <LoadingMask isOpen={creating} message="워크스페이스 생성 중…" />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">내 워크스페이스</h1>
          <button
            type="button"
            onClick={handleCreateWorkspace}
            disabled={creating}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-white/20 hover:bg-white/30 disabled:opacity-50 transition-colors"
          >
            {creating ? '생성 중…' : '+ 워크스페이스 추가'}
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-2 underline">
              닫기
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
            <p className="mb-4">아직 워크스페이스가 없습니다.</p>
            <button
              type="button"
              onClick={handleCreateWorkspace}
              disabled={creating}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-white/20 hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              {creating ? '생성 중…' : '첫 워크스페이스 만들기'}
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {workspaces.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors group"
              >
                <Link href={`/workspace/${w.id}`} className="flex-1 min-w-0 font-medium">
                  {w.name}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setError(null);
                    setDeleteTarget(w);
                  }}
                  className="flex-shrink-0 rounded p-1.5 text-white/50 hover:text-red-400 hover:bg-white/10 transition-colors"
                  title="워크스페이스 삭제"
                  aria-label="워크스페이스 삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="워크스페이스 삭제"
        message={deleteTarget ? `"${deleteTarget.name}" 워크스페이스를 삭제할까요? 포함된 플로우도 모두 삭제됩니다.` : ''}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
}
