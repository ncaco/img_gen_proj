'use client';

import { memo, useEffect, useState, useRef } from 'react';
import { Handle, type NodeProps, Position, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { getFlowCard, type FlowCard } from '@/app/lib/flow';
import CardPreview from '@/app/components/CardPreview';
import { API_BASE } from '@/app/lib/auth';
import type { CardOptionNodeData } from './CardOptionNode';

export type CardPreviewNodeData = {
  flowCardId: number | null;
  imageUrl: string | null;
  cardName: string;
  type: string;
  attribute: string;
  rarity: string;
  attack: string;
  health: string;
  skill1: { name: string; description: string };
  skill2: { name: string; description: string };
  flavorText: string;
  cardNumber: string;
  series: string;
};

function CardPreviewNodeComponent({ data, id }: NodeProps<{ label?: string } & CardPreviewNodeData>) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const [flowCard, setFlowCard] = useState<FlowCard | null>(null);
  const [loading, setLoading] = useState(false);
  const prevSourceDataRef = useRef<string>('');

  // 이전 노드(CardOptionNode)에서 데이터 가져오기
  useEffect(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    if (incomingEdges.length === 0) {
      // 연결된 노드가 없으면 초기화
      if (data.flowCardId !== null || data.cardName || data.type) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    flowCardId: null,
                    imageUrl: null,
                    cardName: '',
                    type: '',
                    attribute: '',
                    rarity: '',
                    attack: '',
                    health: '',
                    skill1: { name: '', description: '' },
                    skill2: { name: '', description: '' },
                    flavorText: '',
                    cardNumber: '',
                    series: '',
                  } as CardPreviewNodeData,
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
    
    // 소스 데이터의 변경 여부 확인 (JSON 문자열로 비교)
    const currentSourceDataStr = JSON.stringify({
      flowCardId: sourceData.flowCardId,
      characterId: sourceData.characterId,
      cardName: sourceData.cardName,
      type: sourceData.type,
      attribute: sourceData.attribute,
      rarity: sourceData.rarity,
      attack: sourceData.attack,
      health: sourceData.health,
      skill1Name: sourceData.skill1Name,
      skill1Description: sourceData.skill1Description,
      skill2Name: sourceData.skill2Name,
      skill2Description: sourceData.skill2Description,
      flavorText: sourceData.flavorText,
      cardNumber: sourceData.cardNumber,
      series: sourceData.series,
    });

    // 데이터가 변경되지 않았으면 업데이트하지 않음
    if (prevSourceDataRef.current === currentSourceDataStr) {
      return;
    }

    prevSourceDataRef.current = currentSourceDataStr;

    // 데이터 업데이트
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                flowCardId: sourceData.flowCardId,
                cardName: sourceData.cardName || '',
                type: sourceData.type || '',
                attribute: sourceData.attribute || '',
                rarity: sourceData.rarity || '',
                attack: sourceData.attack || '',
                health: sourceData.health || '',
                skill1: {
                  name: sourceData.skill1Name || '',
                  description: sourceData.skill1Description || '',
                },
                skill2: {
                  name: sourceData.skill2Name || '',
                  description: sourceData.skill2Description || '',
                },
                flavorText: sourceData.flavorText || '',
                cardNumber: sourceData.cardNumber || '',
                series: sourceData.series || '',
              } as CardPreviewNodeData,
            }
          : n
      )
    );
  }, [edges, nodes, id, setNodes]);

  // FlowCard 이미지 로드
  useEffect(() => {
    if (!data.flowCardId) {
      setFlowCard(null);
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, imageUrl: null } as CardPreviewNodeData } : n
        )
      );
      return;
    }

    setLoading(true);
    getFlowCard(data.flowCardId)
      .then((card) => {
        setFlowCard(card);
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, imageUrl: card.imageUrl || null } as CardPreviewNodeData } : n
          )
        );
      })
      .catch(() => {
        setFlowCard(null);
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, imageUrl: null } as CardPreviewNodeData } : n
          )
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [data.flowCardId, id, setNodes]);

  // type에서 2뎁스만 추출
  const typeDisplay = data.type
    ? data.type.includes(' · ')
      ? data.type.split(' · ')[1]
      : data.type
    : '';

  // FlowCard의 imageUrl을 올바른 URL로 변환
  const characterImageUrl = data.imageUrl
    ? data.imageUrl.startsWith('http')
      ? data.imageUrl
      : `${API_BASE}${data.imageUrl}`
    : undefined;

  const cardData = {
    characterImage: characterImageUrl,
    backgroundImage: undefined, // FlowCard에는 배경 이미지가 없음
    cardName: data.cardName,
    type: typeDisplay,
    attribute: data.attribute,
    rarity: data.rarity,
    attack: data.attack,
    health: data.health,
    skill1: data.skill1,
    skill2: data.skill2,
    flavorText: data.flavorText,
    cardNumber: data.cardNumber,
    series: data.series,
  };

  return (
    <div className="rounded-xl min-w-[420px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">카드 미리보기</span>
      </div>
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center h-64 text-white/50">
            이미지 로드 중...
          </div>
        )}
        {!loading && (!data.flowCardId || !data.cardName) && (
          <div className="flex items-center justify-center h-64 text-white/50">
            카드옵션 박스에서 데이터를 입력하세요.
          </div>
        )}
        {!loading && data.flowCardId && data.cardName && (
          <div className="flex justify-center">
            <CardPreview cardData={cardData} />
          </div>
        )}
      </div>
    </div>
  );
}

export const CardPreviewNode = memo(CardPreviewNodeComponent);
