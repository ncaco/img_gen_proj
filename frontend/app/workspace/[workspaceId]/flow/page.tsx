'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLatestFlow, listFlows } from '@/app/lib/workspace';
import { getStoredToken } from '@/app/lib/auth';

/**
 * /workspace/:id/flow 진입 시 해당 워크스페이스의 (최신 또는 첫) 플로우로 리다이렉트.
 * 라우트 /workspace/37/flow/61 이 정상 매칭되도록 flow 세그먼트에 페이지를 둠.
 */
export default function FlowIndexPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = Number(params.workspaceId);

  useEffect(() => {
    if (!workspaceId || Number.isNaN(workspaceId)) {
      router.replace('/workspace');
      return;
    }
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getLatestFlow(workspaceId)
      .then((flow) => {
        router.replace(`/workspace/${workspaceId}/flow/${flow.id}`);
      })
      .catch(() => {
        listFlows(workspaceId)
          .then((data) => {
            const flows = data.flows ?? [];
            if (flows.length > 0) {
              router.replace(`/workspace/${workspaceId}/flow/${flows[0].id}`);
            } else {
              router.replace(`/workspace/${workspaceId}`);
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
