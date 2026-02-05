'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFlowCard, getFlowCharacter, generateImagePrompt, updateFlowCard, fetchLoreMapping, type FlowCard, type FlowCharacterDetail } from '@/app/lib/flow';
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
}

export default function CardDetailModal({ flowCardId, isOpen, onClose, onUpdateNodes }: CardDetailModalProps) {
  const params = useParams();
  const flowId = params?.flowId != null ? Number(params.flowId) : undefined;
  const [flowCard, setFlowCard] = useState<FlowCard | null>(null);
  const [character, setCharacter] = useState<FlowCharacterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNegative, setCopiedNegative] = useState(false);

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // FlowCard 데이터 로드
  useEffect(() => {
    if (!isOpen || !flowCardId) {
      setFlowCard(null);
      setCharacter(null);
      return;
    }
    setLoading(true);
    getFlowCard(flowCardId)
      .then((card) => {
        setFlowCard(card);
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
    if (!flowCard || !character || generating) return;
    
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
      
      // FlowCard에 프롬프트 저장
      if (flowCardId) {
        await updateFlowCard(flowCardId, {
          prompt: result.prompt,
          negativePrompt: result.negativePrompt,
        });
        // FlowCard 데이터 갱신
        const updatedCard = await getFlowCard(flowCardId);
        setFlowCard(updatedCard);
      }
    } catch (error) {
      console.error('이미지 프롬프트 생성 실패:', error);
      alert('이미지 프롬프트 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
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
            <div className="text-white font-medium">
              {character?.name || '캐릭터'} - {gender} / {attribute} / {type}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRun}
                disabled={!flowCard || !character || generating}
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
            <div className="w-80 flex-shrink-0 flex items-center justify-center p-6 border-r border-white/10 bg-white/5 relative">
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
                <div className="text-white/70">로딩 중...</div>
              ) : flowCard ? (
                <div className="w-full aspect-[5/7] flex flex-col items-center justify-center border border-white/20 bg-white/5 rounded overflow-hidden p-4">
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
    </>
  );
}
