'use client';

import { memo, useCallback } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';

interface NodeAddPanelProps {
  onAddNode: (type: string) => void;
}

function NodeAddPanelComponent({ onAddNode }: NodeAddPanelProps) {
  const handleAddCharacterBox = useCallback(() => {
    onAddNode('characterBox');
  }, [onAddNode]);

  const handleAddCardOption = useCallback(() => {
    onAddNode('cardOption');
  }, [onAddNode]);

  const handleAddCardPreview = useCallback(() => {
    onAddNode('cardPreview');
  }, [onAddNode]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#1a1a1f] border border-white/15 rounded-xl shadow-2xl p-3 flex gap-2">
        <button
          type="button"
          onClick={handleAddCharacterBox}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10"
          title="캐릭터 박스 추가"
        >
          캐릭터 박스
        </button>
        <button
          type="button"
          onClick={handleAddCardOption}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10"
          title="카드옵션 박스 추가"
        >
          카드옵션 박스
        </button>
        <button
          type="button"
          onClick={handleAddCardPreview}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10"
          title="카드 미리보기 박스 추가"
        >
          카드 미리보기 박스
        </button>
      </div>
    </div>
  );
}

export const NodeAddPanel = memo(NodeAddPanelComponent);
