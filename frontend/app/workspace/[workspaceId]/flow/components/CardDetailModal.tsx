'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { getFlowCard, getFlowCharacter, generateImagePrompt, updateFlowCard, uploadFlowCardImage, uploadFlowCardSdImage, uploadFlowCardSymbolImage, fetchLoreMapping, type FlowCard, type FlowCharacterDetail } from '@/app/lib/flow';
import { CATEGORY_SELECT_NODE_ID, type CategorySelectNodeData } from './CategorySelectNode';
import { PROMPT_NODE_ID, type PromptTextareaNodeData } from './PromptTextareaNode';
import { LORE_NODE_ID } from './LoreResultNode';
import { CHARACTER_CONFIG_NODE_ID, type CharacterConfigNodeData } from './CharacterConfigNode';
import type { Node } from '@xyflow/react';

interface CardDetailModalProps {
  flowCardId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNodes?: (updater: (nodes: Node[]) => Node[]) => void;
  onGeneratingChange?: (cardId: number | null, isGenerating: boolean) => void;
  onImageUploaded?: () => void;
  onPromptGenerated?: (cardId: number) => void;
  isGenerating?: boolean;
  flowCards?: FlowCard[]; // 좌우 이동을 위한 카드 목록
  onCardChange?: (flowCardId: number | null) => void; // 카드 변경 콜백
}

export default function CardDetailModal({ flowCardId, isOpen, onClose, onUpdateNodes, onGeneratingChange, onImageUploaded, onPromptGenerated, isGenerating: externalIsGenerating, flowCards = [], onCardChange }: CardDetailModalProps) {
  const params = useParams();
  const flowId = params?.flowId != null ? Number(params.flowId) : undefined;
  const [flowCard, setFlowCard] = useState<FlowCard | null>(null);
  const [character, setCharacter] = useState<FlowCharacterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNegative, setCopiedNegative] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSdImage, setUploadingSdImage] = useState(false);
  const [uploadingSymbolImage, setUploadingSymbolImage] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const sdImageInputRef = useRef<HTMLInputElement>(null);
  const symbolImageInputRef = useRef<HTMLInputElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

  // 현재 카드의 인덱스 찾기
  const currentCardIndex = flowCardId !== null 
    ? flowCards.findIndex(card => card.id === flowCardId)
    : -1;
  
  // 이전/다음 카드로 이동
  const goToPreviousCard = useCallback(() => {
    if (currentCardIndex > 0 && onCardChange) {
      const previousCard = flowCards[currentCardIndex - 1];
      onCardChange(previousCard.id);
    }
  }, [currentCardIndex, flowCards, onCardChange]);

  const goToNextCard = useCallback(() => {
    if (currentCardIndex >= 0 && currentCardIndex < flowCards.length - 1 && onCardChange) {
      const nextCard = flowCards[currentCardIndex + 1];
      onCardChange(nextCard.id);
    }
  }, [currentCardIndex, flowCards, onCardChange]);

  const canGoPrevious = currentCardIndex > 0;
  const canGoNext = currentCardIndex >= 0 && currentCardIndex < flowCards.length - 1;

  // 모달이 열릴 때 외부에서 전달된 isGenerating 상태와 카드의 promptGenerationStatus와 동기화
  useEffect(() => {
    if (isOpen && flowCardId) {
      // 외부 isGenerating 또는 카드의 promptGenerationStatus가 'requested'인 경우 로딩 상태
      const shouldBeGenerating = externalIsGenerating || flowCard?.promptGenerationStatus === 'requested';
      setGenerating(shouldBeGenerating || false);
    } else if (!isOpen || !flowCardId) {
      // 모달이 닫히면 내부 상태만 초기화 (외부 generatingCardId는 유지)
      setGenerating(false);
    }
  }, [isOpen, flowCardId, externalIsGenerating, flowCard?.promptGenerationStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC 키로 모달 닫기, 좌우 화살표로 카드 이동
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageFullscreen) {
          setIsImageFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && canGoPrevious) {
        e.preventDefault();
        goToPreviousCard();
      } else if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        goToNextCard();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isImageFullscreen, canGoPrevious, canGoNext, goToPreviousCard, goToNextCard]);

  // FlowCard 데이터 로드: 목록(flowCards)에 있으면 즉시 표시, 단건 API로 최신 데이터 보강
  useEffect(() => {
    if (!isOpen || !flowCardId) {
      setFlowCard(null);
      setCharacter(null);
      return;
    }
    // 목록에 해당 카드가 있으면 즉시 표시 (도감에서 클릭 시 프롬프트가 비지 않도록)
    const fromList = flowCards.find((c) => c.id === flowCardId);
    if (fromList) {
      setFlowCard(fromList);
    }
    setLoading(true);
    getFlowCard(flowCardId)
      .then((card) => {
        setFlowCard((prev) => ({
          ...card,
          // 단건 API가 prompt/negativePrompt를 비워서 오는 경우 기존(목록) 값 유지
          prompt: card.prompt ?? prev?.prompt ?? null,
          negativePrompt: card.negativePrompt ?? prev?.negativePrompt ?? null,
        }));
        // 캐릭터 정보도 로드
        return Promise.all([Promise.resolve(card), getFlowCharacter(card.characterId)]);
      })
      .then(([card, characterData]) => {
        setCharacter(characterData);
        // 노드에 데이터 셋팅
        if (onUpdateNodes) {
          onUpdateNodes((nodes) =>
            nodes.map((node) => {
              // CategorySelectNode에 성별, 속성, 클래스 셋팅
              if (node.id === CATEGORY_SELECT_NODE_ID) {
                const nodeData = node.data as CategorySelectNodeData;
                return {
                  ...node,
                  data: {
                    ...nodeData,
                    성별: card.gender,
                    속성: card.attribute,
                    클래스: card.type, // FlowCard의 type은 2뎁스만 저장되므로 그대로 사용
                  } as CategorySelectNodeData,
                };
              }
              // PromptTextareaNode에 프롬프트 셋팅
              if (node.id === PROMPT_NODE_ID) {
                const nodeData = node.data as PromptTextareaNodeData;
                return {
                  ...node,
                  data: {
                    ...nodeData,
                    promptText: card.prompt || '',
                  } as PromptTextareaNodeData,
                };
              }
              return node;
            })
          );
        }
      })
      .catch((error) => {
        console.error('FlowCard 또는 캐릭터 로드 실패:', error);
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flowCardId]);

  const handleRun = async () => {
    // 진행 중이거나 요청 중 상태면 실행 불가
    if (!flowCard || !character || generating || flowCard.promptGenerationStatus === 'requested') return;
    
    setGenerating(true);
    try {
      // 먼저 세계관 설정 기능 실행
      if (onUpdateNodes) {
        const name = character.name.trim();
        if (!name) {
          onUpdateNodes((nodes) =>
            nodes.map((n) =>
              n.id === LORE_NODE_ID
                ? { ...n, data: { ...n.data, loreError: '이름을 입력한 뒤 실행하세요.', loreMapping: null } }
                : n
            )
          );
          setGenerating(false);
          return;
        }
        
        // 에러 초기화
        onUpdateNodes((nodes) =>
          nodes.map((n) =>
            n.id === LORE_NODE_ID ? { ...n, data: { ...n.data, loreError: null } } : n
          )
        );
        
        try {
          const { data: loreData, characterId: newCharacterId } = await fetchLoreMapping({
            name,
            description: character.description ?? undefined,
            characterId: character.id,
            flowId,
          });
          
          // 세계관 데이터를 노드에 반영
          onUpdateNodes((nodes) =>
            nodes.map((n) => {
              if (n.id === LORE_NODE_ID) {
                return { ...n, data: { ...n.data, loreMapping: loreData, loreError: null } };
              }
              if (n.id === CHARACTER_CONFIG_NODE_ID) {
                return { ...n, data: { ...n.data, characterId: newCharacterId } as CharacterConfigNodeData };
              }
              return n;
            })
          );
        } catch (loreError) {
          const message = loreError instanceof Error ? loreError.message : '세계관 분석에 실패했습니다.';
          onUpdateNodes((nodes) =>
            nodes.map((n) =>
              n.id === LORE_NODE_ID
                ? { ...n, data: { ...n.data, loreError: message, loreMapping: null } }
                : n
            )
          );
          // 세계관 분석 실패해도 이미지 프롬프트 생성은 계속 진행
        }
      }
      
      // 이미지 프롬프트 생성
      const result = await generateImagePrompt({
        characterId: character.id,
        gender: flowCard.gender,
        attribute: flowCard.attribute,
        type: flowCard.type,
      });
      
      // 노드에 프롬프트 반영
      if (onUpdateNodes) {
        onUpdateNodes((nodes) =>
          nodes.map((node) => {
            // PromptTextareaNode에 프롬프트 셋팅
            if (node.id === PROMPT_NODE_ID) {
              const nodeData = node.data as PromptTextareaNodeData;
              return {
                ...node,
                data: {
                  ...nodeData,
                  promptText: result.prompt,
                } as PromptTextareaNodeData,
              };
            }
            return node;
          })
        );
      }
      
      // FlowCard에 프롬프트 저장 (상태를 'completed'로 설정)
      if (flowCardId) {
        await updateFlowCard(flowCardId, {
          prompt: result.prompt,
          negativePrompt: result.negativePrompt,
          promptGenerationStatus: 'completed',
        });
        // FlowCard 데이터 갱신
        const updatedCard = await getFlowCard(flowCardId);
        setFlowCard(updatedCard);
        
        // 프롬프트 생성 완료 콜백 호출 (목록 새로고침)
        if (onPromptGenerated) {
          onPromptGenerated(flowCardId);
        }
      }
      
      // 성공 알림 표시
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
    } catch (error) {
      console.error('이미지 프롬프트 생성 실패:', error);
      alert('이미지 프롬프트 생성에 실패했습니다.');
      // 에러 발생 시 상태를 null로 리셋
      if (flowCardId) {
        try {
          await updateFlowCard(flowCardId, {
            promptGenerationStatus: null,
          });
          // FlowCard 데이터 갱신
          const updatedCard = await getFlowCard(flowCardId);
          setFlowCard(updatedCard);
        } catch (updateError) {
          console.error('상태 업데이트 실패:', updateError);
        }
      }
    } finally {
      setGenerating(false);
      if (onGeneratingChange && flowCardId) {
        onGeneratingChange(flowCardId, false);
      }
    }
  };

  const handleCopyAll = async () => {
    if (!flowCard) return;
    
    const prompt = flowCard.prompt || '';
    const negativePrompt = flowCard.negativePrompt || '';
    
    const textToCopy = `#Prompt
${prompt}
# Negative Prompt
${negativePrompt}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  const handleCopyPrompt = async () => {
    if (!flowCard?.prompt) return;
    
    try {
      await navigator.clipboard.writeText(flowCard.prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  const handleCopyNegativePrompt = async () => {
    if (!flowCard?.negativePrompt) return;
    
    try {
      await navigator.clipboard.writeText(flowCard.negativePrompt);
      setCopiedNegative(true);
      setTimeout(() => setCopiedNegative(false), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!flowCardId || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    
    setUploadingImage(true);
    try {
      await uploadFlowCardImage(flowCardId, file);
      // FlowCard 데이터 갱신
      const updatedCard = await getFlowCard(flowCardId);
      setFlowCard(updatedCard);
      alert('이미지가 업로드되었습니다.');
      // 이미지 업로드 완료 콜백 호출 (목록 새로고침)
      if (onImageUploaded) {
        onImageUploaded();
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(false);
      // 파일 입력 초기화
      event.target.value = '';
    }
  };

  const handleSdImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!flowCardId || !event.target.files?.length) return;
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setUploadingSdImage(true);
    try {
      await uploadFlowCardSdImage(flowCardId, file);
      const updated = await getFlowCard(flowCardId);
      setFlowCard(updated);
      if (onImageUploaded) onImageUploaded();
    } catch (err) {
      console.error('SD 캐릭터 이미지 업로드 실패:', err);
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploadingSdImage(false);
      event.target.value = '';
      sdImageInputRef.current && (sdImageInputRef.current.value = '');
    }
  };

  const handleSymbolImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!flowCardId || !event.target.files?.length) return;
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setUploadingSymbolImage(true);
    try {
      await uploadFlowCardSymbolImage(flowCardId, file);
      const updated = await getFlowCard(flowCardId);
      setFlowCard(updated);
      if (onImageUploaded) onImageUploaded();
    } catch (err) {
      console.error('심볼 이미지 업로드 실패:', err);
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploadingSymbolImage(false);
      event.target.value = '';
      symbolImageInputRef.current && (symbolImageInputRef.current.value = '');
    }
  };

  if (!isOpen) return null;

  const gender = flowCard?.gender || '전체';
  const attribute = flowCard?.attribute || '전체';
  const type = flowCard?.type || '전체';

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/70 z-[60] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 모달 */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div 
          className="bg-[#1a1a1f] border border-white/20 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="text-white font-medium">
                {character?.name || '캐릭터'} - {gender} / {attribute} / {type}
              </div>
              {/* 좌우 이동 버튼 */}
              {flowCards.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goToPreviousCard}
                    disabled={!canGoPrevious}
                    className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="이전 카드 (←)"
                    aria-label="이전 카드"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-white/60 text-xs">
                    {currentCardIndex + 1} / {flowCards.length}
                  </span>
                  <button
                    type="button"
                    onClick={goToNextCard}
                    disabled={!canGoNext}
                    className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="다음 카드 (→)"
                    aria-label="다음 카드"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRun}
                disabled={!flowCard || !character || generating || flowCard.promptGenerationStatus === 'requested'}
                className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="이미지 프롬프트 생성"
                aria-label="이미지 프롬프트 생성"
              >
                {generating ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                title="닫기"
                aria-label="닫기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 컨텐츠 */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* 왼쪽: 카드 정보 */}
            <div className={`${flowCard?.imageUrl ? 'w-[600px]' : 'w-80'} flex-shrink-0 flex flex-col p-6 border-r border-white/10 bg-white/5 relative transition-all duration-300`}>
              {generating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-white text-sm">프롬프트 생성 중...</span>
                  </div>
                </div>
              )}
              {loading ? (
                <div className="text-white/70 flex items-center justify-center h-full">로딩 중...</div>
              ) : flowCard ? (
                <div className="w-full h-full flex flex-col gap-4">
                  {/* 카드 이미지 영역 */}
                  <div className={`flex-1 w-full ${flowCard.imageUrl ? '' : 'aspect-[5/7]'} flex items-center justify-center border border-white/20 bg-white/5 rounded overflow-hidden relative min-h-0`}>
                    {flowCard.imageUrl ? (
                      <>
                        <img 
                          src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}${flowCard.imageUrl}`}
                          alt={`${character?.name || '캐릭터'} - ${gender} / ${attribute} / ${type}`}
                          className="h-full w-auto max-w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setIsImageFullscreen(true)}
                        />
                        {uploadingImage && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                            <div className="flex flex-col items-center gap-2">
                              <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-white text-sm">업로드 중...</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4">
                        <div className="text-white/80 text-sm font-medium text-center mb-4">
                          {character?.name || '캐릭터'}
                        </div>
                        <div className="text-white/60 text-xs font-medium text-center space-y-2">
                          <div className="text-white/80 font-semibold">성별: {gender}</div>
                          <div className="text-white/40">*</div>
                          <div className="text-white/80 font-semibold">속성: {attribute}</div>
                          <div className="text-white/40">*</div>
                          <div className="text-white/80 font-semibold">클래스: {type}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* 이미지 업로드 버튼 */}
                  <label className="w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage || !flowCardId}
                      className="hidden"
                    />
                    <div className={`w-full px-4 py-2 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors text-sm text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${uploadingImage || !flowCardId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {uploadingImage ? '업로드 중...' : flowCard.imageUrl ? '이미지 변경' : '이미지 등록'}
                    </div>
                  </label>
                  {/* SD 캐릭터 이미지 / 심볼 이미지 나란히 */}
                  <div className="flex flex-row gap-4 w-full">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="text-white/60 text-xs font-medium">SD 캐릭터 이미지</div>
                      {flowCard.sdCharacterImageUrl ? (
                        <img
                          src={`${apiBase}${flowCard.sdCharacterImageUrl.startsWith('/') ? '' : '/'}${flowCard.sdCharacterImageUrl}`}
                          alt="SD 캐릭터"
                          className="w-full h-auto max-h-24 object-contain rounded border border-white/10"
                        />
                      ) : null}
                      <input ref={sdImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleSdImageUpload} />
                      <button
                        type="button"
                        disabled={uploadingSdImage || !flowCardId}
                        onClick={() => sdImageInputRef.current?.click()}
                        className="w-full px-3 py-1.5 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 text-xs disabled:opacity-50"
                      >
                        {uploadingSdImage ? '업로드 중...' : flowCard.sdCharacterImageUrl ? 'SD 캐릭터 이미지 변경' : 'SD 캐릭터 이미지 업로드'}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="text-white/60 text-xs font-medium">심볼 이미지</div>
                      {flowCard.symbolImageUrl ? (
                        <img
                          src={`${apiBase}${flowCard.symbolImageUrl.startsWith('/') ? '' : '/'}${flowCard.symbolImageUrl}`}
                          alt="심볼"
                          className="w-full h-auto max-h-24 object-contain rounded border border-white/10"
                        />
                      ) : null}
                      <input ref={symbolImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleSymbolImageUpload} />
                      <button
                        type="button"
                        disabled={uploadingSymbolImage || !flowCardId}
                        onClick={() => symbolImageInputRef.current?.click()}
                        className="w-full px-3 py-1.5 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 text-xs disabled:opacity-50"
                      >
                        {uploadingSymbolImage ? '업로드 중...' : flowCard.symbolImageUrl ? '심볼 이미지 변경' : '심볼 이미지 업로드'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-[5/7] flex flex-col items-center justify-center border border-white/20 bg-white/5 rounded overflow-hidden">
                  <div className="text-white/60 text-xs font-medium text-center px-2">
                    <div>{gender}</div>
                    <div className="text-white/40">*</div>
                    <div>{attribute}</div>
                    <div className="text-white/40">*</div>
                    <div>{type}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽: 프롬프트 영역 */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* 프롬프트 영역 */}
              <div className="flex-1 min-h-0 flex flex-col border-b border-white/10">
                <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">프롬프트</h3>
                    {flowCard?.prompt && (
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="px-2 py-1 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors text-xs flex items-center gap-1"
                        title="프롬프트 복사"
                      >
                        {copiedPrompt ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>복사</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>복사</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {flowCard && (flowCard.prompt || flowCard.negativePrompt) && (
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      className="px-2 py-1 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors text-xs flex items-center gap-1"
                      title="프롬프트 전체 복사"
                    >
                      {copied ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>복사</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>전체 복사</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                  {loading ? (
                    <div className="text-sm text-white/50">로딩 중...</div>
                  ) : flowCard?.prompt ? (
                    <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono">
                      {flowCard.prompt}
                    </pre>
                  ) : (
                    <div className="text-sm text-white/50">프롬프트가 없습니다.</div>
                  )}
                </div>
              </div>

              {/* 네거티브 프롬프트 영역 */}
              <div className="h-64 flex flex-col border-t border-white/10">
                <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">네거티브 프롬프트</h3>
                    {flowCard?.negativePrompt && (
                      <button
                        type="button"
                        onClick={handleCopyNegativePrompt}
                        className="px-2 py-1 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors text-xs flex items-center gap-1"
                        title="네거티브 프롬프트 복사"
                      >
                        {copiedNegative ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>복사</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>복사</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                  {loading ? (
                    <div className="text-sm text-white/50">로딩 중...</div>
                  ) : flowCard?.negativePrompt ? (
                    <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono">
                      {flowCard.negativePrompt}
                    </pre>
                  ) : (
                    <div className="text-sm text-white/50">네거티브 프롬프트가 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 전체화면 이미지 뷰어 */}
      {isImageFullscreen && flowCard?.imageUrl && typeof window !== 'undefined' && createPortal(
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black/90 z-[9999] transition-opacity"
            onClick={() => setIsImageFullscreen(false)}
            aria-hidden="true"
          />
          {/* 전체화면 이미지 */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              {/* 좌우 이동 버튼 */}
              {flowCards.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPreviousCard();
                    }}
                    disabled={!canGoPrevious}
                    className="absolute left-4 w-14 h-14 flex items-center justify-center rounded-full bg-black/70 hover:bg-black/90 text-white/85 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 shadow-xl z-10"
                    title="이전 카드 (←)"
                    aria-label="이전 카드"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNextCard();
                    }}
                    disabled={!canGoNext}
                    className="absolute right-4 w-14 h-14 flex items-center justify-center rounded-full bg-black/70 hover:bg-black/90 text-white/85 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 shadow-xl z-10"
                    title="다음 카드 (→)"
                    aria-label="다음 카드"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              <img 
                src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}${flowCard.imageUrl}`}
                alt={`${character?.name || '캐릭터'} - ${gender} / ${attribute} / ${type}`}
                className="max-w-full max-h-[calc(100vh-2rem)] object-contain"
              />
              {/* 카드 인덱스 표시 */}
              {flowCards.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                  {currentCardIndex + 1} / {flowCards.length}
                </div>
              )}
              {/* 닫기 버튼 */}
              <button
                type="button"
                onClick={() => setIsImageFullscreen(false)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
                title="닫기 (ESC)"
                aria-label="닫기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 성공 토스트 알림 */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 z-[80] animate-in slide-in-from-bottom-5">
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">프롬프트 생성이 완료되었습니다!</span>
          </div>
        </div>
      )}
    </>
  );
}
