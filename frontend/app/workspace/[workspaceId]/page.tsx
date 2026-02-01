'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listFlows } from '@/app/lib/workspace';
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
    listFlows(workspaceId)
      .then((data) => {
        const flows = data.flows ?? [];
        if (flows.length > 0) {
          router.replace(`/workspace/${workspaceId}/flow/${flows[0].id}`);
        }
      })
      .catch(() => router.replace('/workspace'));
  }, [workspaceId, router]);

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center text-white/70">
      <p>플로우로 이동 중…</p>
    </div>
  );
}
