'use client';

import { memo, useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { fetchLoreMapping } from '@/app/lib/flow';
import { LORE_NODE_ID } from './LoreResultNode';

export type NameInputNodeData = {
  이름?: string;
  /** 인물/세계관 설명 (Lore 분석 시 사용) */
  설명?: string;
  /** 저장된 캐릭터 키 (다음 Run 시 해당 레코드 업데이트) */
  characterId?: number | null;
};

function NameInputNodeComponent(props: NodeProps) {
  const { data: rawData, id } = props;
  const data = rawData as NameInputNodeData;
  const { setNodes } = useReactFlow();
  const params = useParams();
  const flowId = params?.flowId != null ? Number(params.flowId) : undefined;
  const [loadingLore, setLoadingLore] = useState(false);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, 이름: value } as NameInputNodeData } : n
        )
      );
    },
    [id, setNodes]
  );

  const onDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, 설명: value } as NameInputNodeData } : n
        )
      );
    },
    [id, setNodes]
  );

  const onApplyLore = useCallback(async () => {
    const name = (data.이름 ?? '').trim();
    if (!name) {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === LORE_NODE_ID
            ? { ...n, data: { ...n.data, loreError: '이름을 입력한 뒤 실행하세요.', loreMapping: null } }
            : n
        )
      );
      return;
    }
    setLoadingLore(true);
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === LORE_NODE_ID ? { ...n, data: { ...n.data, loreError: null } } : n
      )
    );
    try {
      const { data: loreData, characterId: newCharacterId } = await fetchLoreMapping({
        name,
        description: (data.설명 ?? '').trim(),
        characterId: data.characterId ?? undefined,
        flowId,
      });
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id === LORE_NODE_ID) {
            return { ...n, data: { ...n.data, loreMapping: loreData, loreError: null } };
          }
          if (n.id === id) {
            return { ...n, data: { ...n.data, characterId: newCharacterId } as NameInputNodeData };
          }
          return n;
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : '세계관 분석에 실패했습니다.';
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === LORE_NODE_ID
            ? { ...n, data: { ...n.data, loreError: message, loreMapping: null } }
            : n
        )
      );
    } finally {
      setLoadingLore(false);
    }
  }, [data.이름, data.설명, data.characterId, flowId, id, setNodes]);

  return (
    <div className="rounded-xl min-w-[220px] max-w-[320px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <div className="px-3 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/90">캐릭터 설정</span>
        <button
          type="button"
          onClick={onApplyLore}
          disabled={loadingLore}
          className="flex items-center justify-center w-8 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title="이름·설명으로 세계관 분석 적용"
          aria-label="세계관 분석 실행"
        >
          {loadingLore ? (
            <span className="text-xs">...</span>
          ) : (
            <span className="text-sm leading-none">▶</span>
          )}
        </button>
      </div>
      <div className="p-3 space-y-2">
        <label className="block text-xs text-white/70 mb-1">이름</label>
        <input
          type="text"
          value={data.이름 ?? ''}
          onChange={onChange}
          placeholder="이름 입력"
          className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
        />
        <div>
          <label className="block text-xs text-white/70 mb-1">설명</label>
          <textarea
            value={data.설명 ?? ''}
            onChange={onDescriptionChange}
            placeholder="인물·세계관 설명 (선택)"
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 resize-y min-h-[52px]"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/40" />
      <Handle
        type="source"
        id="to-lore"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-white/60"
      />
    </div>
  );
}

export const NameInputNode = memo(NameInputNodeComponent);
