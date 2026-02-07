'use client';

import { memo, useEffect, useRef, useMemo } from 'react';
import { Handle, type NodeProps, Position, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import type { CardOptionNodeData } from './CardOptionNode';
import { buildPrompt } from '@/app/lib/promptBuilder';

export type PromptBoxNodeData = {
  prompt: string | null;
  negativePrompt: string | null;
};

function PromptBoxNodeComponent({ data, id }: NodeProps<{ label?: string } & PromptBoxNodeData>) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const prevSourceDataRef = useRef<string>('');

  // CardOptionNode에서 카드 데이터 가져오기
  useEffect(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    if (incomingEdges.length === 0) {
      // 연결된 노드가 없으면 초기화
      if (data.prompt !== null || data.negativePrompt !== null) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    prompt: null,
                    negativePrompt: null,
                  } as PromptBoxNodeData,
                }
              : n
          )
        );
      }
      prevSourceDataRef.current = '';
      return;
    }

    const sourceNodeId = incomingEdges[0].source;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode || sourceNode.type !== 'cardOption') return;

    const sourceData = sourceNode.data as CardOptionNodeData;

    // 소스 데이터의 변경 여부 확인
    const currentSourceDataStr = JSON.stringify({
      cardName: sourceData.cardName,
      type: sourceData.type,
      attribute: sourceData.attribute,
      rarity: sourceData.rarity,
      attack: sourceData.attack,
      health: sourceData.health,
      noblePhantasm1Name: sourceData.noblePhantasm1Name,
      noblePhantasm1TrueName: sourceData.noblePhantasm1TrueName,
      noblePhantasm2Name: sourceData.noblePhantasm2Name,
      noblePhantasm2TrueName: sourceData.noblePhantasm2TrueName,
      flavorText: sourceData.flavorText,
      cardNumber: sourceData.cardNumber,
      series: sourceData.series,
    });

    // 데이터가 변경되지 않았으면 업데이트하지 않음
    if (prevSourceDataRef.current === currentSourceDataStr) {
      return;
    }

    prevSourceDataRef.current = currentSourceDataStr;

    // 카드 생성 프롬프트 양식으로 프롬프트 생성
    try {
      const generatedPrompt = buildPrompt({
        type: sourceData.type || '',
        rarity: sourceData.rarity || '',
        cardName: sourceData.cardName || '',
        attribute: sourceData.attribute || '',
        attack: sourceData.attack || '',
        health: sourceData.health || '',
        cardNumber: sourceData.cardNumber || '',
        skill1Name: sourceData.noblePhantasm1Name || '',
        skill1Description: sourceData.noblePhantasm1TrueName || '',
        skill2Name: sourceData.noblePhantasm2Name || '',
        skill2Description: sourceData.noblePhantasm2TrueName || '',
        flavorText: sourceData.flavorText || '',
        series: sourceData.series || '',
      });

      // 데이터 업데이트
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  prompt: generatedPrompt || null,
                  negativePrompt: null, // 네거티브 프롬프트는 카드 생성 양식에 없음
                } as PromptBoxNodeData,
              }
            : n
        )
      );
    } catch (error) {
      console.error('프롬프트 생성 오류:', error);
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  prompt: null,
                  negativePrompt: null,
                } as PromptBoxNodeData,
              }
            : n
        )
      );
    }
  }, [edges, nodes, id, setNodes, data.prompt, data.negativePrompt]);

  return (
    <div className="rounded-xl min-w-[500px] max-w-[800px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">카드 생성 프롬프트</span>
      </div>
      <div className="p-4">
        {/* 프롬프트 */}
        <div>
          <label className="block text-xs text-white/70 mb-2 font-semibold">프롬프트</label>
          {data.prompt ? (
            <div className="rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/15 text-white whitespace-pre-wrap break-words max-h-[600px] overflow-y-auto font-mono">
              {data.prompt}
            </div>
          ) : (
            <div className="rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 text-white/40 italic">
              카드옵션 박스에서 카드 데이터를 연결하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const PromptBoxNode = memo(PromptBoxNodeComponent);
