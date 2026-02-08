'use client';

import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { uploadFlowCardImage, getFlowCard, type FlowCard } from '@/app/lib/flow';
import { API_BASE } from '@/app/lib/auth';
import type { CardPreviewNodeData } from './CardPreviewNode';
import type { PromptBoxNodeData } from './PromptBoxNode';
import { isNodeConnectedToConfirmedCard } from '../utils/cardConfirm';

export type GeneratedImageNodeData = {
  flowCardId: number | null;
  imageUrl: string | null;
  sourceNodeId: string | null;
  localImageUrl: string | null; // 로컬에서 선택한 이미지 (base64 또는 blob URL)
  cardPreviewDownloaded?: boolean; // 카드미리보기 다운로드 버튼 클릭 여부
  promptCopied?: boolean; // 프롬프트 복사 버튼 클릭 여부
};

function GeneratedImageNodeComponent({ data, id }: NodeProps<{ label?: string } & GeneratedImageNodeData>) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const [uploading, setUploading] = useState(false);
  const [flowCard, setFlowCard] = useState<FlowCard | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevSourceDataRef = useRef<string>('');
  
  // 카드 확정 상태 확인
  const isConfirmed = isNodeConnectedToConfirmedCard(id, nodes, edges);
  
  // 이미지 선택 버튼 활성화 여부 확인 (카드미리보기 다운로드 + 프롬프트 복사 모두 완료)
  const canSelectImage = data.cardPreviewDownloaded === true && data.promptCopied === true;

  // 연결된 노드에서 이미지 URL 가져오기
  useEffect(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    if (incomingEdges.length === 0) {
      // 연결된 노드가 없으면 초기화 (로컬 이미지는 유지)
      if (data.imageUrl !== null || data.flowCardId !== null || data.sourceNodeId !== null) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    imageUrl: null,
                    flowCardId: null,
                    sourceNodeId: null,
                    // localImageUrl은 유지 (사용자가 직접 선택한 이미지)
                  } as GeneratedImageNodeData,
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
    if (!sourceNode) return;

    let imageUrl: string | null = null;
    let flowCardId: number | null = null;

    // CardPreviewNode에서 이미지 가져오기
    if (sourceNode.type === 'cardPreview') {
      const sourceData = sourceNode.data as CardPreviewNodeData;
      imageUrl = sourceData.imageUrl || null;
      flowCardId = sourceData.flowCardId;
    }
    // PromptBoxNode에서 연결된 경우, PromptBoxNode가 연결된 CardPreviewNode를 찾아서 이미지 가져오기
    else if (sourceNode.type === 'promptBox') {
      // PromptBoxNode가 target으로 연결된 CardPreviewNode를 찾기 (CardPreviewNode -> PromptBoxNode)
      const promptBoxIncomingEdges = edges.filter((e) => e.target === sourceNodeId);
      for (const edge of promptBoxIncomingEdges) {
        const cardPreviewNode = nodes.find((n) => n.id === edge.source && n.type === 'cardPreview');
        if (cardPreviewNode) {
          const cardPreviewData = cardPreviewNode.data as CardPreviewNodeData;
          imageUrl = cardPreviewData.imageUrl || null;
          flowCardId = cardPreviewData.flowCardId;
          break;
        }
      }
    }

    // 소스 데이터의 변경 여부 확인
    const currentSourceDataStr = JSON.stringify({
      sourceNodeId,
      imageUrl,
      flowCardId,
    });

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
                imageUrl,
                flowCardId,
                sourceNodeId,
              } as GeneratedImageNodeData,
            }
          : n
      )
    );
  }, [edges, nodes, id, setNodes, data.imageUrl, data.flowCardId]);

  // FlowCard 이미지 로드
  useEffect(() => {
    if (!data.flowCardId) {
      setFlowCard(null);
      return;
    }

    setLoading(true);
    getFlowCard(data.flowCardId)
      .then((card) => {
        setFlowCard(card);
        // FlowCard의 이미지 URL이 있으면 업데이트
        if (card.imageUrl && card.imageUrl !== data.imageUrl) {
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      imageUrl: card.imageUrl || null,
                    } as GeneratedImageNodeData,
                  }
                : n
            )
          );
        }
      })
      .catch(() => {
        setFlowCard(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [data.flowCardId, id, setNodes, data.imageUrl]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      // 확정된 카드는 수정 불가
      if (isNodeConnectedToConfirmedCard(id, nodes, edges)) {
        alert('확정된 카드는 수정할 수 없습니다.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }

      // 로컬 미리보기 생성
      const reader = new FileReader();
      reader.onload = (event) => {
        const localUrl = event.target?.result as string;
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    localImageUrl: localUrl,
                  } as GeneratedImageNodeData,
                }
              : n
          )
        );
      };
      reader.readAsDataURL(file);

      // flowCardId가 있으면 서버에 업로드
      if (data.flowCardId) {
        setUploading(true);
        try {
          await uploadFlowCardImage(data.flowCardId, file);
          // FlowCard 데이터 갱신
          const updatedCard = await getFlowCard(data.flowCardId);
          setFlowCard(updatedCard);
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      imageUrl: updatedCard.imageUrl || null,
                      localImageUrl: null, // 서버 업로드 후 로컬 URL 제거
                    } as GeneratedImageNodeData,
                  }
                : n
            )
          );
        } catch (error) {
          console.error('이미지 업로드 실패:', error);
          alert('이미지 업로드에 실패했습니다.');
        } finally {
          setUploading(false);
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [data.flowCardId, id, setNodes, nodes, edges]
  );

  // 이미지 URL 생성 (로컬 이미지 우선, 없으면 서버 이미지)
  const imageUrl = data.localImageUrl
    ? data.localImageUrl
    : data.imageUrl
    ? data.imageUrl.startsWith('http')
      ? data.imageUrl
      : `${API_BASE}${data.imageUrl}`
    : null;

  return (
    <div className="rounded-xl min-w-[320px] max-w-[480px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <span className="text-xs font-medium text-white/90">생성 이미지 첨부</span>
      </div>
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center h-64 text-white/50">
            이미지 로드 중...
          </div>
        )}
        {!loading && !imageUrl && !data.flowCardId && (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center h-64 text-white/50 text-center border border-white/10 rounded-lg bg-white/5">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm mb-4">카드 미리보기 또는 프롬프트 박스에서 연결하거나<br />이미지를 직접 업로드하세요.</p>
            </div>
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={isConfirmed || uploading || !canSelectImage}
              className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>
                {isConfirmed 
                  ? '확정된 카드는 수정할 수 없습니다' 
                  : !canSelectImage 
                    ? '카드미리보기 다운로드와 프롬프트 복사를 먼저 해주세요' 
                    : '이미지 선택'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
        {!loading && imageUrl && (
          <div className="space-y-3">
            <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-white/5 border border-white/10">
              <img
                src={imageUrl}
                alt="생성된 이미지"
                className="w-full h-full object-contain"
              />
            </div>
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={isConfirmed || uploading || !canSelectImage}
              className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>업로드 중...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>
                    {isConfirmed 
                      ? '확정된 카드는 수정할 수 없습니다' 
                      : !canSelectImage 
                        ? '카드미리보기 다운로드와 프롬프트 복사를 먼저 해주세요' 
                        : (data.flowCardId ? '이미지 변경' : '이미지 변경')}
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
        {!loading && !imageUrl && data.flowCardId && (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center h-64 text-white/50 text-center border border-white/10 rounded-lg bg-white/5">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm mb-4">이미지가 없습니다.</p>
            </div>
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={isConfirmed || uploading || !canSelectImage}
              className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>업로드 중...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>
                    {isConfirmed 
                      ? '확정된 카드는 수정할 수 없습니다' 
                      : !canSelectImage 
                        ? '카드미리보기 다운로드와 프롬프트 복사를 먼저 해주세요' 
                        : '이미지 업로드'}
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const GeneratedImageNode = memo(GeneratedImageNodeComponent);
