'use client';

import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { Handle, type NodeProps, Position, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { API_BASE } from '@/app/lib/auth';
import { getStoredToken } from '@/app/lib/auth';
import { getFlowCard, type FlowCard } from '@/app/lib/flow';
import { toPng } from 'html-to-image';
import type { GeneratedImageNodeData } from './GeneratedImageNode';
import type { CardOptionNodeData } from './CardOptionNode';
import type { CardPreviewNodeData } from './CardPreviewNode';
import type { PromptBoxNodeData } from './PromptBoxNode';

export type CardConfirmNodeData = {
  cardData: CardOptionNodeData | null;
  imageUrl: string | null;
  prompt: string | null;
  sourceNodeId: string | null;
  previewImageUrl: string | null; // 카드 미리보기 이미지 URL
  cardPreviewNodeId: string | null; // 카드 미리보기 노드 ID (이미지 생성용)
  savedCardSn: number | null; // 저장된 카드 일련번호 (한 번만 확정 가능하도록 체크용)
};

function CardConfirmNodeComponent({ data, id }: NodeProps<{ label?: string } & CardConfirmNodeData>) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCardExists, setIsCardExists] = useState(false);
  const [checkingCardExists, setCheckingCardExists] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const prevDataRef = useRef<string>('');

  // 연결된 노드에서 데이터 가져오기
  useEffect(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    if (incomingEdges.length === 0) {
      // 연결된 노드가 없으면 초기화
      if (data.cardData !== null || data.imageUrl !== null || data.prompt !== null || data.previewImageUrl !== null || data.cardPreviewNodeId !== null || data.savedCardSn !== null) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    cardData: null,
                    imageUrl: null,
                    prompt: null,
                    sourceNodeId: null,
                    previewImageUrl: null,
                    cardPreviewNodeId: null,
                    savedCardSn: null,
                  } as CardConfirmNodeData,
                }
              : n
          )
        );
      }
      setError(null);
      setIsCardExists(false);
      return;
    }

    const sourceNodeId = incomingEdges[0].source;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    let cardData: CardOptionNodeData | null = null;
    let imageUrl: string | null = null;
    let prompt: string | null = null;
    let previewImageUrl: string | null = null;
    let cardPreviewNodeId: string | null = null;

    // PromptBoxNode가 직접 연결된 경우 (카드생성프롬프트 박스)
    if (sourceNode.type === 'promptBox') {
      const promptBoxData = sourceNode.data as PromptBoxNodeData;
      prompt = promptBoxData.prompt || null;
      console.log('PromptBoxNode가 직접 연결됨, 프롬프트:', prompt ? '있음' : '없음');
      
      // PromptBoxNode가 연결된 CardOptionNode 찾기
      const promptBoxIncomingEdges = edges.filter((e) => e.target === sourceNodeId);
      for (const promptEdge of promptBoxIncomingEdges) {
        const cardOptionNode = nodes.find((n) => n.id === promptEdge.source && n.type === 'cardOption');
        if (cardOptionNode) {
          cardData = cardOptionNode.data as CardOptionNodeData;
          break;
        }
      }
      
      // 이미지와 미리보기는 다른 노드에서 찾기
      // GeneratedImageNode 찾기
      const allGeneratedImageNodes = nodes.filter((n) => n.type === 'generatedImage');
      for (const genImageNode of allGeneratedImageNodes) {
        const genImageData = genImageNode.data as GeneratedImageNodeData;
        if (genImageData.imageUrl || genImageData.localImageUrl) {
          imageUrl = genImageData.localImageUrl || genImageData.imageUrl || null;
          break;
        }
      }
      
      // CardPreviewNode 찾기
      const allCardPreviewNodes = nodes.filter((n) => n.type === 'cardPreview');
      for (const cardPreviewNode of allCardPreviewNodes) {
        const cardPreviewData = cardPreviewNode.data as CardPreviewNodeData;
        if (cardPreviewData.imageUrl) {
          previewImageUrl = cardPreviewData.imageUrl || null;
          cardPreviewNodeId = cardPreviewNode.id;
          break;
        }
      }
    }
    // GeneratedImageNode에서 연결된 경우
    else if (sourceNode.type === 'generatedImage') {
      const sourceData = sourceNode.data as GeneratedImageNodeData;
      imageUrl = sourceData.localImageUrl || sourceData.imageUrl || null;
      
      // GeneratedImageNode가 연결된 상위 노드 찾기 (CardOptionNode, CardPreviewNode, PromptBoxNode)
      const generatedImageIncomingEdges = edges.filter((e) => e.target === sourceNodeId);
      
      // 1. CardOptionNode 찾기 (가장 우선)
      for (const edge of generatedImageIncomingEdges) {
        const cardNode = nodes.find((n) => n.id === edge.source);
        if (cardNode?.type === 'cardOption') {
          cardData = cardNode.data as CardOptionNodeData;
          
          // CardOptionNode가 연결된 PromptBoxNode 찾기 (카드생성프롬프트 박스)
          const promptBoxEdges = edges.filter((e) => e.source === cardNode.id);
          for (const promptEdge of promptBoxEdges) {
            const promptBoxNode = nodes.find((n) => n.id === promptEdge.target && n.type === 'promptBox');
            if (promptBoxNode) {
              const promptBoxData = promptBoxNode.data as PromptBoxNodeData;
              prompt = promptBoxData.prompt || null;
              console.log('PromptBoxNode에서 프롬프트 찾음:', prompt ? '있음' : '없음');
              break;
            }
          }
          
          // 프롬프트를 찾지 못한 경우, GeneratedImageNode에서 연결된 PromptBoxNode 찾기
          if (!prompt) {
            for (const edge of generatedImageIncomingEdges) {
              const promptBoxNode = nodes.find((n) => n.id === edge.source && n.type === 'promptBox');
              if (promptBoxNode) {
                const promptBoxData = promptBoxNode.data as PromptBoxNodeData;
                prompt = promptBoxData.prompt || null;
                console.log('GeneratedImageNode에서 PromptBoxNode 찾음:', prompt ? '있음' : '없음');
                break;
              }
            }
          }
          
          // CardOptionNode가 연결된 CardPreviewNode 찾기 (미리보기 이미지)
          const cardPreviewEdges = edges.filter((e) => e.source === cardNode.id);
          for (const previewEdge of cardPreviewEdges) {
            const cardPreviewNode = nodes.find((n) => n.id === previewEdge.target && n.type === 'cardPreview');
            if (cardPreviewNode) {
              const cardPreviewData = cardPreviewNode.data as CardPreviewNodeData;
              previewImageUrl = cardPreviewData.imageUrl || null;
              cardPreviewNodeId = cardPreviewNode.id;
              // 프롬프트는 PromptBoxNode에서만 가져오므로 CardPreviewNode의 프롬프트는 사용하지 않음
              break;
            }
          }
          break;
        }
      }
      
      // 2. CardPreviewNode 찾기 (CardOptionNode를 찾지 못한 경우)
      if (!cardData) {
        for (const edge of generatedImageIncomingEdges) {
          const cardNode = nodes.find((n) => n.id === edge.source);
          if (cardNode?.type === 'cardPreview') {
            const cardPreviewData = cardNode.data as CardPreviewNodeData;
            // 카드 미리보기 이미지 URL 저장
            previewImageUrl = cardPreviewData.imageUrl || null;
            cardPreviewNodeId = cardNode.id;
            // CardPreviewNode에서 CardOptionNode 찾기
            const cardPreviewIncomingEdges = edges.filter((e) => e.target === cardNode.id);
            for (const previewEdge of cardPreviewIncomingEdges) {
              const cardOptionNode = nodes.find((n) => n.id === previewEdge.source && n.type === 'cardOption');
              if (cardOptionNode) {
                cardData = cardOptionNode.data as CardOptionNodeData;
                // 프롬프트는 PromptBoxNode에서만 가져오므로 CardPreviewNode의 프롬프트는 사용하지 않음
                // CardOptionNode가 연결된 PromptBoxNode 찾기
                const promptBoxEdges = edges.filter((e) => e.source === cardOptionNode.id);
                for (const promptEdge of promptBoxEdges) {
                  const promptBoxNode = nodes.find((n) => n.id === promptEdge.target && n.type === 'promptBox');
                  if (promptBoxNode) {
                    const promptBoxData = promptBoxNode.data as PromptBoxNodeData;
                    prompt = promptBoxData.prompt || null;
                    console.log('CardPreviewNode 경로에서 PromptBoxNode 찾음:', prompt ? '있음' : '없음');
                    break;
                  }
                }
                break;
              }
            }
            // CardOptionNode를 찾지 못한 경우 CardPreviewNode 데이터를 사용
            if (!cardData) {
              cardData = {
                flowCardId: cardPreviewData.flowCardId,
                characterId: null,
                gender: '',
                attribute: cardPreviewData.attribute,
                type: cardPreviewData.type,
                cardName: cardPreviewData.cardName,
                rarity: cardPreviewData.rarity,
                attack: cardPreviewData.attack,
                health: cardPreviewData.health,
                noblePhantasm1Name: cardPreviewData.noblePhantasm1.name,
                noblePhantasm1TrueName: cardPreviewData.noblePhantasm1.description,
                noblePhantasm2Name: cardPreviewData.noblePhantasm2.name,
                noblePhantasm2TrueName: cardPreviewData.noblePhantasm2.description,
                flavorText: cardPreviewData.flavorText,
                cardNumber: cardPreviewData.cardNumber,
                series: cardPreviewData.series,
              };
              // 프롬프트는 PromptBoxNode에서만 가져오므로 CardPreviewNode의 프롬프트는 사용하지 않음
            }
            break;
          }
        }
      }
      
      // 3. PromptBoxNode 찾기 (CardOptionNode와 CardPreviewNode를 찾지 못한 경우)
      if (!cardData) {
        for (const edge of generatedImageIncomingEdges) {
          const cardNode = nodes.find((n) => n.id === edge.source);
          if (cardNode?.type === 'promptBox') {
            const promptBoxData = cardNode.data as PromptBoxNodeData;
            prompt = promptBoxData.prompt || null;
            console.log('PromptBoxNode 직접 연결됨, 프롬프트:', prompt ? '있음' : '없음');
            // PromptBoxNode가 연결된 CardOptionNode 찾기
            const promptBoxIncomingEdges = edges.filter((e) => e.target === cardNode.id);
            for (const promptEdge of promptBoxIncomingEdges) {
              const cardOptionNode = nodes.find((n) => n.id === promptEdge.source && n.type === 'cardOption');
              if (cardOptionNode) {
                cardData = cardOptionNode.data as CardOptionNodeData;
                break;
              }
            }
            break;
          }
        }
      }
      
      // 프롬프트를 아직 찾지 못한 경우, 모든 PromptBoxNode에서 찾기
      // CardOptionNode와 연결된 PromptBoxNode 우선 찾기
      if (!prompt && cardData) {
        const allPromptBoxNodes = nodes.filter((n) => n.type === 'promptBox');
        for (const promptBoxNode of allPromptBoxNodes) {
          const promptBoxData = promptBoxNode.data as PromptBoxNodeData;
          if (promptBoxData.prompt) {
            // 이 PromptBoxNode가 현재 CardOptionNode와 연결되어 있는지 확인
            const promptBoxEdges = edges.filter((e) => 
              (e.source === cardData.flowCardId?.toString() || e.source === promptBoxNode.id || e.target === promptBoxNode.id)
            );
            const relatedCardOptionNodes = promptBoxEdges
              .map((e) => {
                const sourceNode = nodes.find((n) => n.id === e.source);
                const targetNode = nodes.find((n) => n.id === e.target);
                return sourceNode?.type === 'cardOption' ? sourceNode : targetNode?.type === 'cardOption' ? targetNode : null;
              })
              .filter(Boolean);
            
            // CardOptionNode와 연결되어 있거나, 같은 flowCardId를 가진 경우
            if (relatedCardOptionNodes.length > 0 || 
                (cardData.flowCardId && promptBoxEdges.some(e => 
                  nodes.find(n => (n.id === e.source || n.id === e.target) && n.type === 'cardOption' && (n.data as CardOptionNodeData).flowCardId === cardData.flowCardId)
                ))) {
              prompt = promptBoxData.prompt;
              console.log('전체 노드에서 PromptBoxNode 찾음 (CardOptionNode와 연결됨)');
              break;
            }
          }
        }
      }
      
      // 여전히 프롬프트를 찾지 못한 경우, 모든 PromptBoxNode에서 찾기 (마지막 시도)
      if (!prompt) {
        const allPromptBoxNodes = nodes.filter((n) => n.type === 'promptBox');
        for (const promptBoxNode of allPromptBoxNodes) {
          const promptBoxData = promptBoxNode.data as PromptBoxNodeData;
          if (promptBoxData.prompt) {
            prompt = promptBoxData.prompt;
            console.log('전체 노드에서 PromptBoxNode 찾음 (마지막 시도)');
            break;
          }
        }
      }
    }

    // 데이터 변경 여부 확인 (무한 루프 방지)
    const currentDataStr = JSON.stringify({
      sourceNodeId,
      cardData: cardData ? {
        cardName: cardData.cardName,
        type: cardData.type,
        attribute: cardData.attribute,
        rarity: cardData.rarity,
        attack: cardData.attack,
        health: cardData.health,
        flowCardId: cardData.flowCardId,
      } : null,
      imageUrl,
      prompt,
      previewImageUrl,
      cardPreviewNodeId,
    });

    // 데이터가 변경되지 않았으면 업데이트하지 않음
    if (prevDataRef.current === currentDataStr) {
      return;
    }

    prevDataRef.current = currentDataStr;

    // 데이터 업데이트
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                cardData,
                imageUrl,
                prompt,
                sourceNodeId,
                previewImageUrl,
                cardPreviewNodeId,
              } as CardConfirmNodeData,
            }
          : n
      )
    );
  }, [edges, nodes, id, setNodes, data.savedCardSn]);

  // 저장된 카드 존재 여부 확인
  useEffect(() => {
    const checkCardExists = async () => {
      if (!data.savedCardSn) {
        setIsCardExists(false);
        return;
      }

      setCheckingCardExists(true);
      try {
        const response = await fetch(`${API_BASE}/api/v1/cards/${data.savedCardSn}/exists`);
        if (response.ok) {
          const result = await response.json();
          setIsCardExists(result.exists || false);
        } else {
          setIsCardExists(false);
        }
      } catch (error) {
        console.error('카드 존재 여부 확인 실패:', error);
        setIsCardExists(false);
      } finally {
        setCheckingCardExists(false);
      }
    };

    checkCardExists();
  }, [data.savedCardSn]);

  // base64를 Blob으로 변환
  const base64ToBlob = useCallback((base64: string, mimeType: string = 'image/png'): Blob => {
    const base64Data = base64.split(',')[1] || base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  }, []);

  // 이미지 업로드
  const uploadImage = useCallback(
    async (imageData: string): Promise<string | null> => {
      try {
        let blob: Blob;
        let file: File;

        if (imageData.startsWith('data:')) {
          // base64 이미지
          blob = base64ToBlob(imageData);
          file = new File([blob], `generated_${Date.now()}.png`, { type: 'image/png' });
        } else if (imageData.startsWith('blob:')) {
          // blob URL
          const response = await fetch(imageData);
          blob = await response.blob();
          file = new File([blob], `generated_${Date.now()}.png`, { type: blob.type || 'image/png' });
        } else {
          // 이미 URL인 경우 그대로 반환
          return imageData;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subdirectory', 'cards');

        const response = await fetch(`${API_BASE}/api/v1/upload/single`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('이미지 업로드 실패');
        }

        const result = await response.json();
        return result.file_url || null;
      } catch (error) {
        console.error('이미지 업로드 오류:', error);
        throw error;
      }
    },
    [base64ToBlob]
  );

  // 카드 미리보기에서 이미지 생성
  const generateCardPreviewImage = useCallback(async (cardPreviewNodeId: string): Promise<string | null> => {
    try {
      // CardPreviewNode의 DOM 요소 찾기
      const cardPreviewNode = nodes.find((n) => n.id === cardPreviewNodeId && n.type === 'cardPreview');
      if (!cardPreviewNode) {
        console.warn('카드 미리보기 노드를 찾을 수 없습니다.');
        return null;
      }

      // ReactFlow의 노드 DOM 요소 찾기
      // ReactFlow는 각 노드를 특정 클래스나 데이터 속성으로 렌더링합니다
      // 노드의 DOM 요소를 찾기 위해 약간의 지연이 필요할 수 있습니다
      await new Promise((resolve) => setTimeout(resolve, 100));

      // ReactFlow 노드 컨테이너에서 카드 미리보기 요소 찾기
      const reactFlowNode = document.querySelector(`[data-id="${cardPreviewNodeId}"]`);
      if (!reactFlowNode) {
        console.warn('ReactFlow 노드 DOM을 찾을 수 없습니다.');
        return null;
      }

      // 카드 미리보기 요소 찾기
      const cardElement = reactFlowNode.querySelector('div[data-card-preview="true"]') as HTMLElement | null;
      if (!cardElement) {
        console.warn('카드 미리보기 요소를 찾을 수 없습니다.');
        return null;
      }

      // 이미지 로드 대기
      const waitForImages = (element: HTMLElement): Promise<void> => {
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
      };

      await waitForImages(cardElement);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 카드 미리보기를 이미지로 변환
      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: 'transparent',
        skipFonts: true,
      });

      return dataUrl;
    } catch (error) {
      console.error('카드 미리보기 이미지 생성 실패:', error);
      return null;
    }
  }, [nodes]);

  // 카드 확정 처리
  const handleConfirm = useCallback(async () => {
    if (!data.cardData) {
      setError('카드 데이터가 없습니다. 카드 옵션 박스를 연결하세요.');
      return;
    }

    if (!data.imageUrl) {
      setError('이미지가 없습니다. 생성 이미지 첨부 박스를 연결하세요.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = getStoredToken();
      if (!token) {
        setError('카드 저장을 위해 로그인이 필요합니다.');
        return;
      }

      // 카드 데이터 가져오기
      const cardData = data.cardData;

      // FlowCard의 imageUrl 가져오기 (character_image_url용)
      let flowCardImageUrl: string | null = null;
      if (cardData?.flowCardId) {
        try {
          const flowCard: FlowCard = await getFlowCard(cardData.flowCardId);
          flowCardImageUrl = flowCard.imageUrl || null;
        } catch (error) {
          console.warn('FlowCard 조회 실패:', error);
          // FlowCard 조회 실패는 경고만 하고 계속 진행
        }
      }

      // 카드 미리보기에서 이미지 생성 (generated_image_url용)
      // 플로우의 카드 미리보기 컴포넌트를 이미지로 변환하여 저장
      let previewImageUrl: string | null = null;
      
      // 카드 미리보기 노드 찾기 (우선순위: cardPreviewNodeId > 연결된 노드에서 찾기)
      let cardPreviewNodeIdToUse: string | null = data.cardPreviewNodeId || null;
      
      // cardPreviewNodeId가 없으면 연결된 노드에서 CardPreviewNode 찾기
      if (!cardPreviewNodeIdToUse && cardData?.flowCardId) {
        const incomingEdges = edges.filter((e) => e.target === id);
        for (const edge of incomingEdges) {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          if (sourceNode?.type === 'generatedImage') {
            // GeneratedImageNode에서 연결된 경우, 상위 노드 찾기
            const generatedImageIncomingEdges = edges.filter((e) => e.target === edge.source);
            for (const genEdge of generatedImageIncomingEdges) {
              const cardPreviewNode = nodes.find((n) => n.id === genEdge.source && n.type === 'cardPreview');
              if (cardPreviewNode) {
                cardPreviewNodeIdToUse = cardPreviewNode.id;
                break;
              }
            }
          }
        }
      }
      
      // 카드 미리보기 이미지 생성 및 업로드
      if (cardPreviewNodeIdToUse) {
        try {
          // 카드 미리보기 컴포넌트를 이미지로 변환
          const cardPreviewImageDataUrl = await generateCardPreviewImage(cardPreviewNodeIdToUse);
          if (cardPreviewImageDataUrl) {
            // 이미지를 업로드 (백엔드에서 카드 생성 경로로 자동 재배치)
            previewImageUrl = await uploadImage(cardPreviewImageDataUrl);
            console.log('카드 미리보기 템플릿 이미지 생성 및 업로드 완료:', previewImageUrl);
          } else {
            console.warn('카드 미리보기 이미지 생성 실패 (dataUrl이 null)');
            // 이미지 생성 실패 시 기존 previewImageUrl 사용
            if (data.previewImageUrl) {
              previewImageUrl = await uploadImage(data.previewImageUrl);
            }
          }
        } catch (error) {
          console.warn('카드 미리보기 이미지 생성/업로드 실패:', error);
          // 실패 시 기존 previewImageUrl 사용
          if (data.previewImageUrl) {
            try {
              previewImageUrl = await uploadImage(data.previewImageUrl);
            } catch (uploadError) {
              console.warn('미리보기 이미지 업로드 실패:', uploadError);
            }
          }
        }
      } else if (data.previewImageUrl) {
        // cardPreviewNodeId가 없으면 기존 previewImageUrl 사용
        try {
          previewImageUrl = await uploadImage(data.previewImageUrl);
        } catch (error) {
          console.warn('미리보기 이미지 업로드 실패:', error);
        }
      } else {
        console.warn('카드 미리보기 노드를 찾을 수 없습니다. generated_image_url이 저장되지 않습니다.');
      }

      // 카드 저장
      // generatedImageUrl에 카드 미리보기 템플릿 이미지 저장
      // generatedPrompt에 카드생성프롬프트 박스의 프롬프트 저장
      console.log('카드 저장 요청:', {
        cardName: cardData.cardName,
        generatedPrompt: data.prompt ? '있음' : '없음', // 카드생성프롬프트 박스의 프롬프트
        generatedImageUrl: previewImageUrl, // 카드 미리보기 템플릿 이미지 URL
      });
      
      const saveResponse = await fetch(`${API_BASE}/api/v1/cards/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cardData: {
            cardName: cardData.cardName || '',
            type: cardData.type || '',
            attribute: cardData.attribute || '',
            rarity: cardData.rarity || '',
            attack: cardData.attack || '0',
            health: cardData.health || '0',
            skill1Name: cardData.noblePhantasm1Name || '',
            skill1Description: cardData.noblePhantasm1TrueName || '',
            skill2Name: cardData.noblePhantasm2Name || '',
            skill2Description: cardData.noblePhantasm2TrueName || '',
            flavorText: cardData.flavorText || '',
            cardNumber: cardData.cardNumber || '',
            series: cardData.series || 'Default / Ncaco.Inc',
            gender: '', // CardOptionNodeData에는 gender가 없을 수 있음
          },
          characterImageUrl: flowCardImageUrl, // FlowCard의 image_url
          backgroundImageUrl: null,
          generatedPrompt: data.prompt || null, // 플로우의 카드생성프롬프트 박스(PromptBoxNode)의 프롬프트 데이터
          generatedImageUrl: previewImageUrl, // 카드 미리보기 박스에 생성된 템플릿 이미지
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || '카드 저장 실패');
      }

      const saveResult = await saveResponse.json();
      const cardSn = saveResult.cardSn;

      if (!cardSn) {
        throw new Error('카드 일련번호를 받지 못했습니다.');
      }

      // 노드 데이터에 savedCardSn 저장 (한 번만 확정 가능하도록)
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  savedCardSn: cardSn,
                } as CardConfirmNodeData,
              }
            : n
        )
      );

      // 생성 이미지를 card_generated_images 테이블에 저장 (1건만)
      if (data.imageUrl) {
        try {
          // 이미지 파일을 가져와서 업로드
          let imageFile: File;
          if (data.imageUrl.startsWith('data:')) {
            const blob = base64ToBlob(data.imageUrl);
            imageFile = new File([blob], `gen_${Date.now()}.png`, { type: 'image/png' });
          } else if (data.imageUrl.startsWith('blob:')) {
            const response = await fetch(data.imageUrl);
            const blob = await response.blob();
            imageFile = new File([blob], `gen_${Date.now()}.png`, { type: blob.type || 'image/png' });
          } else {
            // URL인 경우 fetch로 가져오기
            const response = await fetch(data.imageUrl.startsWith('http') ? data.imageUrl : `${API_BASE}${data.imageUrl}`);
            const blob = await response.blob();
            imageFile = new File([blob], `gen_${Date.now()}.png`, { type: blob.type || 'image/png' });
          }

          const formData = new FormData();
          formData.append('file', imageFile);

          const genImageResponse = await fetch(`${API_BASE}/api/v1/cards/${cardSn}/generated-image`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!genImageResponse.ok) {
            console.warn('생성 이미지 저장 실패:', await genImageResponse.json().catch(() => ({})));
            // 생성 이미지 저장 실패는 경고만 하고 계속 진행
          }
        } catch (error) {
          console.warn('생성 이미지 저장 중 오류:', error);
          // 생성 이미지 저장 실패는 경고만 하고 계속 진행
        }
      }

      alert('카드가 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('카드 저장 오류:', error);
      setError(error instanceof Error ? error.message : '카드 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [data, uploadImage, generateCardPreviewImage, id, setNodes, nodes, edges]);

  // 확정 여부 새로고침: API로 확인 후 미확정이면 savedCardSn 제거 → 생성이미지첨부 활성화
  const handleRefreshConfirmStatus = useCallback(async () => {
    if (!data.savedCardSn) {
      setIsCardExists(false);
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/cards/${data.savedCardSn}/exists`);
      if (!response.ok) {
        setIsCardExists(false);
        return;
      }
      const result = await response.json();
      const exists = result.exists === true;
      setIsCardExists(exists);
      // 서버에 카드가 없으면(미확정) savedCardSn 제거 → 이미지 첨부 박스 활성화
      if (!exists) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    savedCardSn: null,
                  } as CardConfirmNodeData,
                }
              : n
          )
        );
      }
    } catch (err) {
      console.error('확정 여부 확인 실패:', err);
      setError('확정 여부를 가져오지 못했습니다.');
    } finally {
      setRefreshing(false);
    }
  }, [data.savedCardSn, id, setNodes]);

  // 카드가 이미 존재하면 확정 불가 (한 번만 수행 가능)
  const canConfirm = data.cardData && data.imageUrl && !saving && !isCardExists && !checkingCardExists;

  return (
    <div className="rounded-xl min-w-[320px] max-w-[400px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/90">카드 확정</span>
        <button
          type="button"
          onClick={handleRefreshConfirmStatus}
          disabled={refreshing || !data.savedCardSn}
          className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          title="확정 여부 새로고침"
          aria-label="확정 여부 새로고침"
        >
          {refreshing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>
      <div className="p-4 space-y-4">
        {!data.cardData && (
          <div className="text-sm text-white/50 text-center py-4">
            카드 옵션 박스를 연결하세요.
          </div>
        )}
        {data.cardData && !data.imageUrl && (
          <div className="text-sm text-white/50 text-center py-4">
            생성 이미지 첨부 박스를 연결하세요.
          </div>
        )}
        {data.cardData && data.imageUrl && (
          <>
            <div className="space-y-2">
              <div className="text-xs text-white/70">
                <span className="font-semibold">카드명:</span> {data.cardData.cardName || '(없음)'}
              </div>
              <div className="text-xs text-white/70">
                <span className="font-semibold">타입:</span> {data.cardData.type || '(없음)'}
              </div>
              <div className="text-xs text-white/70">
                <span className="font-semibold">속성:</span> {data.cardData.attribute || '(없음)'}
              </div>
              <div className="text-xs text-white/70">
                <span className="font-semibold">등급:</span> {data.cardData.rarity || '(없음)'}
              </div>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-xs">
                {error}
              </div>
            )}
            {isCardExists && (
              <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 text-xs">
                이미 확정된 카드입니다. (일련번호: {data.savedCardSn})
              </div>
            )}
            {data.savedCardSn && !isCardExists && (
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-200 text-xs">
                카드가 저장되었습니다. (일련번호: {data.savedCardSn})
              </div>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>저장 중...</span>
                </>
              ) : checkingCardExists ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>확인 중...</span>
                </>
              ) : isCardExists ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>이미 확정됨</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>카드 확정</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export const CardConfirmNode = memo(CardConfirmNodeComponent);
