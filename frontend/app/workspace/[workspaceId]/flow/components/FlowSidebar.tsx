'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { listFlows, createFlow, deleteFlow, type FlowItem } from '@/app/lib/workspace';
import ConfirmModal from '@/app/components/ConfirmModal';

interface FlowSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  currentFlowId: number | null;
  onFlowSelect: (flowId: number) => void;
}

export default function FlowSidebar({ isOpen, onClose, workspaceId, currentFlowId, onFlowSelect }: FlowSidebarProps) {
  const router = useRouter();
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlowItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 플로우 목록 로드
  const loadFlows = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listFlows(workspaceId);
      setFlows(data.flows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '플로우 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, workspaceId]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // 플로우 생성
  const handleCreateFlow = async () => {
    setError(null);
    setCreating(true);
    try {
      const newFlow = await createFlow(workspaceId, '새 플로우');
      setFlows((prev) => [newFlow, ...prev]);
      // 새 플로우로 이동
      onFlowSelect(newFlow.id);
      router.push(`/workspace/${workspaceId}/flow/${newFlow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '플로우 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // 플로우 삭제 확인
  const handleDeleteClick = (flow: FlowItem) => {
    setDeleteTarget(flow);
  };

  // 플로우 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteFlow(workspaceId, deleteTarget.id);
      setFlows((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      
      // 현재 플로우가 삭제된 경우 다른 플로우로 이동
      if (deleteTarget.id === currentFlowId) {
        const remainingFlows = flows.filter((f) => f.id !== deleteTarget.id);
        if (remainingFlows.length > 0) {
          onFlowSelect(remainingFlows[0].id);
          router.push(`/workspace/${workspaceId}/flow/${remainingFlows[0].id}`);
        } else {
          // 플로우가 없으면 워크스페이스 페이지로 이동
          router.push(`/workspace/${workspaceId}`);
        }
      }
      
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '플로우 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  // 플로우 선택
  const handleFlowClick = (flowId: number) => {
    if (flowId !== currentFlowId) {
      onFlowSelect(flowId);
      router.push(`/workspace/${workspaceId}/flow/${flowId}`);
    }
    onClose();
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 사이드바 */}
      <div
        className={`fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-full bg-[#1a1a1f] border-l border-white/10 z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 헤더 */}
        <div className="border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-medium text-white">플로우 목록</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCreateFlow}
                disabled={creating}
                className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="플로우 추가"
                aria-label="플로우 추가"
              >
                {creating ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                title="닫기"
                aria-label="닫기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 플로우 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-white/50" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : flows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-white/50">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">플로우가 없습니다</p>
            </div>
          ) : (
            <div className="p-2">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className={`group relative p-3 rounded mb-2 cursor-pointer transition-colors ${
                    flow.id === currentFlowId
                      ? 'bg-blue-600/20 border border-blue-500/50'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                  onClick={() => handleFlowClick(flow.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{flow.name || '새 플로우'}</h3>
                      {flow.lastAccessedAt && (
                        <p className="text-xs text-white/50 mt-1">
                          마지막 접속: {formatDate(flow.lastAccessedAt)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(flow);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-all"
                      aria-label="삭제"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="플로우 삭제"
        message={`"${deleteTarget?.name || '새 플로우'}" 플로우를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText={deleting ? '삭제 중...' : '삭제'}
        cancelText="취소"
        variant="danger"
      />
    </>
  );
}
