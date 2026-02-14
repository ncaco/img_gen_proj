'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CategoryOptionsProvider } from '@/app/workspace/[workspaceId]/flow/context/CategoryOptionsContext';
import { FlowUIProvider, useFlowUI } from '@/app/workspace/[workspaceId]/flow/context/FlowUIContext';
import EncyclopediaSidebar from '@/app/workspace/[workspaceId]/flow/components/EncyclopediaSidebar';

function EncyclopediaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setEncyclopediaSelection } = useFlowUI();

  useEffect(() => {
    const characterId = searchParams.get('characterId');
    const gender = searchParams.get('gender');
    const attribute = searchParams.get('attribute');
    const type = searchParams.get('type');
    if (characterId) {
      setEncyclopediaSelection({
        characterId: Number(characterId),
        gender: gender ?? null,
        attribute: attribute ?? null,
        type: type ?? null,
      });
    }
  }, [searchParams, setEncyclopediaSelection]);

  return (
    <EncyclopediaSidebar
      isOpen
      onClose={() => router.back()}
      onUpdateNodes={undefined}
      nodes={[]}
      flowId={undefined}
      onRegenerateCharacter={undefined}
    />
  );
}

export default function EncyclopediaPage() {
  return (
    <div className="min-h-screen bg-[#0c0c0f] pt-14">
      <CategoryOptionsProvider>
        <FlowUIProvider>
          <EncyclopediaContent />
        </FlowUIProvider>
      </CategoryOptionsProvider>
    </div>
  );
}
