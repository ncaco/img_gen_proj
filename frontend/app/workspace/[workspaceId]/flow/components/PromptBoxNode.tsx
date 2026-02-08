'use client';

import { memo, useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import type { CardOptionNodeData } from './CardOptionNode';
import { buildPrompt } from '@/app/lib/promptBuilder';
import { PROMPT_TEMPLATES, type TemplateId } from '@/app/lib/promptTemplate';

export type PromptBoxNodeData = {
  prompt: string | null;
  negativePrompt: string | null;
  templateId?: TemplateId;
};

function PromptBoxNodeComponent({ data, id }: NodeProps<{ label?: string } & PromptBoxNodeData>) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const prevSourceDataRef = useRef<string>('');
  const [copied, setCopied] = useState(false);
  const selectedTemplateId = data.templateId || 'basic';

  const handleCopyToClipboard = useCallback(async () => {
    if (!data.prompt) return;
    
    try {
      await navigator.clipboard.writeText(data.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      // 폴백: 텍스트 영역을 생성하여 복사
      const textArea = document.createElement('textarea');
      textArea.value = data.prompt;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('폴백 복사 실패:', err);
      }
      document.body.removeChild(textArea);
    }
  }, [data.prompt]);

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

    // 소스 데이터의 변경 여부 확인 (템플릿 ID 포함)
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
      templateId: selectedTemplateId,
    });

    // 데이터가 변경되지 않았으면 업데이트하지 않음
    if (prevSourceDataRef.current === currentSourceDataStr) {
      return;
    }

    prevSourceDataRef.current = currentSourceDataStr;

    // "부모 · 하위" 형식에서 2뎁스 클래스(하위)만 추출
    const typeParts = sourceData.type.split(' · ');
    const typeVal = typeParts.length > 1 ? typeParts[1] : sourceData.type;

    // 카드 생성 프롬프트 양식으로 프롬프트 생성
    try {
      const generatedPrompt = buildPrompt({
        type: typeVal || '',
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
      }, selectedTemplateId);

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
  }, [edges, nodes, id, setNodes, data.prompt, data.negativePrompt, selectedTemplateId]);

  const handleTemplateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplateId = e.target.value as TemplateId;
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                templateId: newTemplateId,
              } as PromptBoxNodeData,
            }
          : n
      )
    );
  }, [id, setNodes]);

  return (
    <div className="rounded-xl min-w-[500px] max-w-[800px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <span className="text-xs font-medium text-white/90">카드 생성 프롬프트</span>
        {data.prompt && (
          <button
            onClick={handleCopyToClipboard}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            title="클립보드에 복사"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="p-4">
        {/* 템플릿 선택 */}
        <div className="mb-4">
          <label className="block text-xs text-white/70 mb-2 font-semibold">프롬프트 템플릿</label>
          <select
            value={selectedTemplateId}
            onChange={handleTemplateChange}
            className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            {Object.values(PROMPT_TEMPLATES).map((template) => (
              <option key={template.id} value={template.id} className="bg-[#1a1a1f]">
                {template.name}
              </option>
            ))}
          </select>
        </div>
        {/* 프롬프트 */}
        <div>
          <label className="block text-xs text-white/70 mb-2 font-semibold">프롬프트</label>
          {data.prompt ? (
            <div className="rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/15 text-white whitespace-pre-wrap break-words font-mono">
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
