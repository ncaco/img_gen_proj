'use client';

import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { getFlowCard, type FlowCard } from '@/app/lib/flow';
import CardPreview from '@/app/components/CardPreview';
import { API_BASE } from '@/app/lib/auth';
import type { CardOptionNodeData } from './CardOptionNode';
import { toPng } from 'html-to-image';

export type CardPreviewNodeData = {
  flowCardId: number | null;
  imageUrl: string | null;
  cardName: string;
  type: string;
  attribute: string;
  rarity: string;
  attack: string;
  health: string;
  noblePhantasm1: { name: string; description: string };
  noblePhantasm2: { name: string; description: string };
  flavorText: string;
  cardNumber: string;
  series: string;
  prompt: string | null;
  negativePrompt: string | null;
};

function CardPreviewNodeComponent({ data, id }: NodeProps<{ label?: string } & CardPreviewNodeData>) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const [flowCard, setFlowCard] = useState<FlowCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const prevSourceDataRef = useRef<string>('');
  const cardPreviewRef = useRef<HTMLDivElement>(null);

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
                    noblePhantasm1: { name: '', description: '' },
                    noblePhantasm2: { name: '', description: '' },
                    flavorText: '',
                    cardNumber: '',
                    series: '',
                    prompt: null,
                    negativePrompt: null,
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

    // 데이터 업데이트 (prompt와 negativePrompt는 FlowCard 로드 시 설정되므로 유지)
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
                // noblePhantasm1Name에는 보구명이, noblePhantasm1TrueName에는 진명개방이 저장됨
                noblePhantasm1: {
                  name: sourceData.noblePhantasm1Name || '', // 보구명
                  description: sourceData.noblePhantasm1TrueName || '', // 진명개방
                },
                noblePhantasm2: {
                  name: sourceData.noblePhantasm2Name || '', // 보구명
                  description: sourceData.noblePhantasm2TrueName || '', // 진명개방
                },
                flavorText: sourceData.flavorText || '',
                cardNumber: sourceData.cardNumber || '',
                series: sourceData.series || '',
                // prompt와 negativePrompt는 FlowCard 로드 시 설정되므로 기존 값 유지
                prompt: (n.data as CardPreviewNodeData).prompt ?? null,
                negativePrompt: (n.data as CardPreviewNodeData).negativePrompt ?? null,
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
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    imageUrl: card.imageUrl || null,
                    prompt: card.prompt || null,
                    negativePrompt: card.negativePrompt || null,
                  } as CardPreviewNodeData,
                }
              : n
          )
        );
      })
      .catch(() => {
        setFlowCard(null);
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    imageUrl: null,
                    prompt: null,
                    negativePrompt: null,
                  } as CardPreviewNodeData,
                }
              : n
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
    skill1: data.noblePhantasm1,
    skill2: data.noblePhantasm2,
    flavorText: data.flavorText,
    cardNumber: data.cardNumber,
    series: data.series,
  };

  // 이미지 로드 대기 함수
  const waitForImages = useCallback((element: HTMLElement): Promise<void> => {
    return new Promise((resolve) => {
      const images: HTMLImageElement[] = [];
      element.querySelectorAll('img').forEach((img) => images.push(img as HTMLImageElement));
      const bgDivs = element.querySelectorAll('div[style*="background-image"]');
      bgDivs.forEach((div) => {
        const style = window.getComputedStyle(div);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const urlMatch = bgImage.match(/url\(["']?([^"']+)["']?\)/);
          if (urlMatch) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = urlMatch[1];
            images.push(img);
          }
        }
      });
      if (images.length === 0) {
        setTimeout(resolve, 200);
        return;
      }
      let loadedCount = 0;
      const totalImages = images.length;
      const checkComplete = () => {
        loadedCount++;
        if (loadedCount === totalImages) setTimeout(resolve, 300);
      };
      images.forEach((img) => {
        if (img.complete) checkComplete();
        else {
          img.onload = checkComplete;
          img.onerror = checkComplete;
        }
      });
    });
  }, []);

  // 카드 이미지 다운로드
  const handleDownload = useCallback(async () => {
    if (!cardPreviewRef.current || !data.cardName) return;

    setDownloading(true);
    try {
      const cardElement = cardPreviewRef.current.querySelector('div[data-card-preview="true"]') as HTMLElement | null;
      if (!cardElement) {
        alert('카드 미리보기를 찾을 수 없습니다.');
        return;
      }

      await waitForImages(cardElement);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: 'transparent',
        skipFonts: true,
      });

      // 다운로드
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${data.cardName || 'card'}_${data.cardNumber || Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
      alert('이미지 다운로드에 실패했습니다.');
    } finally {
      setDownloading(false);
    }
  }, [data.cardName, data.cardNumber, waitForImages]);

  return (
    <div className="rounded-xl min-w-[420px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <Handle type="source" position={Position.Right} id="prompt" className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <span className="text-xs font-medium text-white/90">카드 미리보기</span>
        {!loading && data.flowCardId && data.cardName && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="카드 이미지 다운로드"
          >
            {downloading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="p-4" ref={cardPreviewRef}>
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
