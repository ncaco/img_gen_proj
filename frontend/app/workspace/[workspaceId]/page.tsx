'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLatestFlow, listFlows } from '@/app/lib/workspace';
import { getStoredToken } from '@/app/lib/auth';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = Number(params.workspaceId);

  useEffect(() => {
    if (!workspaceId || Number.isNaN(workspaceId)) return;
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    // 가장 최근에 접속한 플로우 찾기
    getLatestFlow(workspaceId)
      .then((flow) => {
        router.replace(`/workspace/${workspaceId}/flow/${flow.id}`);
      })
      .catch(() => {
        // 최근 플로우가 없으면 첫 번째 플로우로 이동
        listFlows(workspaceId)
          .then((data) => {
            const flows = data.flows ?? [];
            if (flows.length > 0) {
              router.replace(`/workspace/${workspaceId}/flow/${flows[0].id}`);
            }
          })
          .catch(() => router.replace('/workspace'));
      });
  }, [workspaceId, router]);

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center text-white/70">
      <p>플로우로 이동 중…</p>
    </div>
  );
}
