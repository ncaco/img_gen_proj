'use client';

import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { listFlowCharacters, getFlowCharacter, generateFlowCards, listFlowCards, fetchLoreMapping, type FlowCharacter, type FlowCharacterDetail, type FlowCard } from '@/app/lib/flow';
import { useCategoryOptions } from '../context/CategoryOptionsContext';
import CardGrid from './CardGrid';
import CardDetailModal from './CardDetailModal';
import { CHARACTER_CONFIG_NODE_ID, type CharacterConfigNodeData } from './CharacterConfigNode';
import { LORE_NODE_ID } from './LoreResultNode';

interface EncyclopediaSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateNodes?: (updater: (nodes: any[]) => any[]) => void;
  nodes?: any[];
  flowId?: number;
  onRegenerateCharacter?: () => void;
}

type ViewMode = 'characters' | 'cards';

export default function EncyclopediaSidebar({ isOpen, onClose, onUpdateNodes, nodes = [], flowId, onRegenerateCharacter }: EncyclopediaSidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('characters');
  const [characters, setCharacters] = useState<FlowCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>('');
  const [selectedCharacterDetail, setSelectedCharacterDetail] = useState<FlowCharacterDetail | null>(null);
  const [characterDetailLoading, setCharacterDetailLoading] = useState(false);
  const [isCharacterDetailOpen, setIsCharacterDetailOpen] = useState(false);
  const [cards, setCards] = useState<FlowCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [attributeFilter, setAttributeFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedFlowCardId, setSelectedFlowCardId] = useState<number | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [regeneratingCharacter, setRegeneratingCharacter] = useState(false);
  const [generatingCardId, setGeneratingCardId] = useState<number | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const categoryOptions = useCategoryOptions();

  // 캐릭터 목록 로드
  useEffect(() => {
    if (!isOpen || viewMode !== 'characters') return;
    setLoading(true);
    listFlowCharacters()
      .then((res) => {
        setCharacters(res.characters);
      })
      .catch(() => {
        setCharacters([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, viewMode]);

  // 카드 목록 로드 (필터 변경 시)
  const loadCards = useCallback(() => {
    if (viewMode !== 'cards' || !selectedCharacterId) return;
    setLoading(true);
    listFlowCards({
      characterId: selectedCharacterId,
      gender: genderFilter ?? undefined,
      attribute: attributeFilter ?? undefined,
      type: typeFilter ?? undefined,
    })
      .then((res) => {
        setCards(res.cards);
      })
      .catch(() => {
        setCards([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [viewMode, selectedCharacterId, genderFilter, attributeFilter, typeFilter]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleCharacterClick = async (character: FlowCharacter) => {
    setSelectedCharacterId(character.id);
    setSelectedCharacterName(character.name);
    setSelectedCharacterDetail(null);
    setIsCharacterDetailOpen(false);
    setGenderFilter(null);
    setAttributeFilter(null);
    setTypeFilter(null);
    setViewMode('cards');
    
    // 클래스 목록 생성: 2뎁스만 추출
    const classList: string[] = [];
    if (categoryOptions.classTree.length > 0) {
      categoryOptions.classTree.forEach((level1) => {
        if (level1.children && level1.children.length > 0) {
          level1.children.forEach((level2) => {
            // 2뎁스만 추가
            classList.push(level2.name);
          });
        }
      });
    } else if (categoryOptions.class.length > 0) {
      classList.push(...categoryOptions.class);
    }
    
    // 캐릭터 클릭 시 모든 조합의 FlowCard 생성
    try {
      setLoading(true);
      await generateFlowCards({
        characterId: character.id,
        genders: categoryOptions.gender,
        attributes: categoryOptions.attribute,
        types: classList.length > 0 ? classList : categoryOptions.class,
      });
    } catch (error) {
      console.error('카드 생성 실패:', error);
      // 에러가 발생해도 계속 진행 (이미 존재하는 카드일 수 있음)
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterDetailToggle = useCallback(async () => {
    if (isCharacterDetailOpen) {
      setIsCharacterDetailOpen(false);
      return;
    }

    if (!selectedCharacterId) return;

    setIsCharacterDetailOpen(true);
    if (selectedCharacterDetail) return; // 이미 로드된 경우

    setCharacterDetailLoading(true);
    try {
      const detail = await getFlowCharacter(selectedCharacterId);
      setSelectedCharacterDetail(detail);
    } catch (error) {
      console.error('캐릭터 상세 정보 로드 실패:', error);
    } finally {
      setCharacterDetailLoading(false);
    }
  }, [isCharacterDetailOpen, selectedCharacterId, selectedCharacterDetail]);

  const handleBackToCharacters = () => {
    setViewMode('characters');
    setSelectedCharacterId(null);
    setSelectedCharacterName('');
    setGenderFilter(null);
    setAttributeFilter(null);
    setTypeFilter(null);
    setCards([]);
  };

  const handleGenderFilterChange = (gender: string | null) => {
    setGenderFilter(gender);
  };

  const handleAttributeFilterChange = (attribute: string | null) => {
    setAttributeFilter(attribute);
  };

  const handleTypeFilterChange = (type: string | null) => {
    setTypeFilter(type);
  };

  const handleCardClick = (flowCardId: number | null) => {
    setSelectedFlowCardId(flowCardId);
    setIsCardModalOpen(true);
  };

  const handleCloseCardModal = () => {
    setIsCardModalOpen(false);
    setSelectedFlowCardId(null);
    // 진행 중인 프롬프트 생성이 있으면 generatingCardId는 유지 (백그라운드 작업 계속)
    // 완료되면 handlePromptGenerated에서 초기화됨
  };

  const handlePromptGenerated = (cardId: number) => {
    // 프롬프트 생성 완료 시 목록 새로고침 및 로딩 상태 초기화
    setGeneratingCardId(null);
    loadCards();
  };

  const handleGeneratingChange = (cardId: number | null, isGenerating: boolean) => {
    if (isGenerating) {
      setGeneratingCardId(cardId);
    } else {
      // 생성 완료 또는 에러 발생 시 로딩 상태 초기화
      // 단, 프롬프트 생성 완료는 handlePromptGenerated에서 처리
      if (generatingCardId === cardId) {
        setGeneratingCardId(null);
      }
    }
  };

  const handleDownloadZip = useCallback(async () => {
    if (cards.length === 0) {
      alert('다운로드할 카드가 없습니다.');
      return;
    }

    // 이미지가 있는 카드만 필터링
    const cardsWithImages = cards.filter(card => card.imageUrl);
    if (cardsWithImages.length === 0) {
      alert('이미지가 있는 카드가 없습니다.');
      return;
    }

    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      
      // 클래스 목록 생성: 2뎁스만 추출
      const classList: string[] = [];
      if (categoryOptions.classTree.length > 0) {
        categoryOptions.classTree.forEach((level1) => {
          if (level1.children && level1.children.length > 0) {
            level1.children.forEach((level2) => {
              // 2뎁스만 추가
              classList.push(level2.name);
            });
          }
        });
      } else if (categoryOptions.class.length > 0) {
        classList.push(...categoryOptions.class);
      }
      
      // 각 카드의 이미지를 다운로드하여 zip에 추가
      await Promise.all(
        cardsWithImages.map(async (card) => {
          try {
            const imageUrl = card.imageUrl!;
            const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${apiBase}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            
            const response = await fetch(fullUrl);
            if (!response.ok) {
              console.warn(`이미지 다운로드 실패: ${fullUrl}`);
              return;
            }
            
            const blob = await response.blob();
            
            // 순서 찾기 (인덱스 + 1, 1부터 시작, 2자리 포맷: 01, 02, ...)
            const genderIndex = categoryOptions.gender.indexOf(card.gender);
            const genderOrder = genderIndex >= 0 ? String(genderIndex + 1).padStart(2, '0') : '00';
            
            const attributeIndex = categoryOptions.attribute.indexOf(card.attribute);
            const attributeOrder = attributeIndex >= 0 ? String(attributeIndex + 1).padStart(2, '0') : '00';
            
            const classIndex = classList.indexOf(card.type);
            const classOrder = classIndex >= 0 ? String(classIndex + 1).padStart(2, '0') : '00';
            
            // 파일명 생성: 순서_성별_순서_속성_순서_클래스_id.{확장자}
            const extension = blob.type.split('/')[1] || 'png';
            const fileName = `${genderOrder}_${card.gender}_${attributeOrder}_${card.attribute}_${classOrder}_${card.type}_${card.id}.${extension}`;
            
            zip.file(fileName, blob);
          } catch (error) {
            console.error(`카드 ${card.id} 이미지 다운로드 실패:`, error);
          }
        })
      );

      // zip 파일명 생성: 캐릭터명_성별_속성_클래스_날짜.zip
      const dateStr = new Date().toISOString().split('T')[0];
      const genderFilterStr = genderFilter ? genderFilter : '전체';
      const attributeFilterStr = attributeFilter ? attributeFilter : '전체';
      const typeFilterStr = typeFilter ? typeFilter : '전체';
      const zipFileName = `${selectedCharacterName || 'cards'}_${genderFilterStr}_${attributeFilterStr}_${typeFilterStr}_${dateStr}.zip`;
      
      // zip 파일 생성 및 다운로드
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('ZIP 다운로드 실패:', error);
      alert('ZIP 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingZip(false);
    }
  }, [cards, selectedCharacterName]);

  const handleRegenerateCharacter = useCallback(async () => {
    console.log('handleRegenerateCharacter 호출됨', {
      selectedCharacterId,
      selectedCharacterName,
      hasOnRegenerateCharacter: !!onRegenerateCharacter,
      hasOnUpdateNodes: !!onUpdateNodes,
    });

    // 사이드바에서 선택된 캐릭터 정보가 있으면 그것을 사용, 없으면 노드에서 가져오기
    let name: string;
    let description: string;
    let characterId: number | undefined;
    
    if (selectedCharacterId) {
      console.log('사이드바에서 선택된 캐릭터 사용:', selectedCharacterId);
      // 사이드바에서 선택된 캐릭터가 있으면 사용
      // selectedCharacterDetail이 없으면 로드
      let characterDetail = selectedCharacterDetail;
      if (!characterDetail && selectedCharacterId) {
        try {
          console.log('캐릭터 상세 정보 로드 중...');
          characterDetail = await getFlowCharacter(selectedCharacterId);
          setSelectedCharacterDetail(characterDetail);
          console.log('캐릭터 상세 정보 로드 완료:', characterDetail);
        } catch (error) {
          console.error('캐릭터 정보 로드 실패:', error);
          // 에러가 발생해도 이름은 사용 가능
        }
      }
      
      if (characterDetail) {
        name = characterDetail.name.trim();
        description = (characterDetail.description ?? '').trim();
      } else {
        // 캐릭터 상세 정보가 없어도 이름은 사용 가능
        name = selectedCharacterName.trim();
        description = '';
      }
      characterId = selectedCharacterId;
    } else {
      console.log('노드에서 정보 가져오기 시도');
      // 노드에서 정보 가져오기
      const characterConfigNode = nodes.find((n) => n.id === CHARACTER_CONFIG_NODE_ID);
      if (!characterConfigNode) {
        console.log('노드가 없고 캐릭터도 선택되지 않음');
        if (onUpdateNodes) {
          onUpdateNodes((nodes) =>
            nodes.map((n) =>
              n.id === LORE_NODE_ID
                ? { ...n, data: { ...n.data, loreError: '캐릭터를 선택하거나 노드에 이름을 입력하세요.', loreMapping: null } }
                : n
            )
          );
        }
        alert('캐릭터를 선택하거나 노드에 이름을 입력하세요.');
        return;
      }
      
      const data = characterConfigNode.data as CharacterConfigNodeData;
      name = (data.이름 ?? '').trim();
      description = (data.설명 ?? '').trim();
      characterId = data.characterId ?? undefined;
    }
    
    if (!name) {
      console.log('이름이 없음');
      if (onUpdateNodes) {
        onUpdateNodes((nodes) =>
          nodes.map((n) =>
            n.id === LORE_NODE_ID
              ? { ...n, data: { ...n.data, loreError: '이름을 입력한 뒤 실행하세요.', loreMapping: null } }
              : n
          )
        );
      }
      alert('이름을 입력한 뒤 실행하세요.');
      return;
    }
    
    console.log('세계관 분석 시작:', { name, description, characterId, flowId });
    
    setRegeneratingCharacter(true);
    if (onUpdateNodes) {
      onUpdateNodes((nodes) =>
        nodes.map((n) =>
          n.id === LORE_NODE_ID ? { ...n, data: { ...n.data, loreError: null } } : n
        )
      );
    }
    
    try {
      const { data: loreData, characterId: newCharacterId } = await fetchLoreMapping({
        name,
        description,
        characterId,
        flowId,
      });
      console.log('세계관 분석 완료:', loreData, 'newCharacterId:', newCharacterId);
      
      if (onUpdateNodes) {
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
      }
      
      // 캐릭터 상세 정보 갱신
      if (selectedCharacterId === newCharacterId || newCharacterId) {
        try {
          const updatedDetail = await getFlowCharacter(newCharacterId);
          setSelectedCharacterDetail(updatedDetail);
          // selectedCharacterId가 없었으면 설정
          if (!selectedCharacterId) {
            setSelectedCharacterId(newCharacterId);
            setSelectedCharacterName(updatedDetail.name);
          }
          console.log('캐릭터 상세 정보 갱신 완료');
        } catch (error) {
          console.error('캐릭터 정보 갱신 실패:', error);
        }
      }
      
      // onRegenerateCharacter가 있으면 호출 (추가 동작)
      if (onRegenerateCharacter) {
        onRegenerateCharacter();
      }
    } catch (e) {
      console.error('세계관 분석 실패:', e);
      const message = e instanceof Error ? e.message : '세계관 분석에 실패했습니다.';
      if (onUpdateNodes) {
        onUpdateNodes((nodes) =>
          nodes.map((n) =>
            n.id === LORE_NODE_ID
              ? { ...n, data: { ...n.data, loreError: message, loreMapping: null } }
              : n
          )
        );
      }
      alert(`세계관 분석에 실패했습니다: ${message}`);
    } finally {
      setRegeneratingCharacter(false);
    }
  }, [nodes, flowId, onUpdateNodes, onRegenerateCharacter, selectedCharacterId, selectedCharacterDetail, selectedCharacterName]);

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 사이드바 */}
      <div
        className={`fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-full bg-[#1a1a1f] border-l border-white/10 z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 헤더 */}
        <div className="border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              {viewMode === 'cards' && (
                <button
                  type="button"
                  onClick={handleBackToCharacters}
                  className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                  title="캐릭터 목록으로 돌아가기"
                  aria-label="뒤로가기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-sm font-medium text-white">
                {viewMode === 'characters' ? '도감' : selectedCharacterName}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {viewMode === 'cards' && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={downloadingZip || cards.length === 0 || !cards.some(card => card.imageUrl)}
                    className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="카드 이미지 ZIP 다운로드"
                    aria-label="카드 이미지 ZIP 다운로드"
                  >
                    {downloadingZip ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateCharacter}
                    disabled={regeneratingCharacter || (!selectedCharacterId && !nodes.find((n) => n.id === CHARACTER_CONFIG_NODE_ID))}
                    className="w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="캐릭터 설정 재생성"
                    aria-label="캐릭터 설정 재생성"
                  >
                    {regeneratingCharacter ? (
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
                </>
              )}
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
          {/* 캐릭터 상세 정보 콜랩스 */}
          {viewMode === 'cards' && selectedCharacterId && (
            <div className="border-t border-white/10">
              <button
                type="button"
                onClick={handleCharacterDetailToggle}
                className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-xs text-white/70">캐릭터 설정 정보</span>
                <svg
                  className={`w-4 h-4 text-white/70 transition-transform ${isCharacterDetailOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isCharacterDetailOpen && (
                <div className="px-4 pb-3 border-t border-white/10">
                  {characterDetailLoading ? (
                    <div className="py-2 text-xs text-white/70">로딩 중...</div>
                  ) : selectedCharacterDetail ? (
                    <div className="py-2 space-y-2 text-xs text-white/80">
                      {selectedCharacterDetail.description && (
                        <div>
                          <div className="text-white/60 mb-1">설명</div>
                          <div className="pl-2">{selectedCharacterDetail.description}</div>
                        </div>
                      )}
                      {selectedCharacterDetail.historicalOrMythical && (
                        <div>
                          <div className="text-white/60 mb-1">역사/신화</div>
                          <div className="pl-2">{selectedCharacterDetail.historicalOrMythical}</div>
                        </div>
                      )}
                      {selectedCharacterDetail.originCountry && (
                        <div>
                          <div className="text-white/60 mb-1">출신</div>
                          <div className="pl-2">{selectedCharacterDetail.originCountry}</div>
                        </div>
                      )}
                      {selectedCharacterDetail.era && (
                        <div>
                          <div className="text-white/60 mb-1">시대</div>
                          <div className="pl-2">{selectedCharacterDetail.era}</div>
                        </div>
                      )}
                      {selectedCharacterDetail.mainArchetype && (
                        <div>
                          <div className="text-white/60 mb-1">아키타입</div>
                          <div className="pl-2">{selectedCharacterDetail.mainArchetype}</div>
                        </div>
                      )}
                      {selectedCharacterDetail.legendRank && (
                        <div>
                          <div className="text-white/60 mb-1">전설성</div>
                          <div className="pl-2">{selectedCharacterDetail.legendRank}</div>
                        </div>
                      )}
                      {selectedCharacterDetail.mysteryLevel && (
                        <div>
                          <div className="text-white/60 mb-1">신비도</div>
                          <div className="pl-2">{selectedCharacterDetail.mysteryLevel}</div>
                        </div>
                      )}
                      {selectedCharacterDetail.divinityPotential && (
                        <div>
                          <div className="text-white/60 mb-1">신성</div>
                          <div className="pl-2">{selectedCharacterDetail.divinityPotential}</div>
                        </div>
                      )}
                      {selectedCharacterDetail.noblePhantasms && selectedCharacterDetail.noblePhantasms.length > 0 && (
                        <div>
                          <div className="text-white/60 mb-1">보구</div>
                          <div className="pl-2">
                            {selectedCharacterDetail.noblePhantasms.map((item, idx) => (
                              <div key={idx}>
                                • {item.보구명}
                                {item.진명개방 && <span className="text-white/50"> ({item.진명개방})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedCharacterDetail.keyAchievements.length > 0 && (
                        <div>
                          <div className="text-white/60 mb-1">업적</div>
                          <div className="pl-2">
                            {selectedCharacterDetail.keyAchievements.map((item, idx) => (
                              <div key={idx}>• {item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 text-xs text-white/70">정보가 없습니다.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'characters' ? (
            /* 캐릭터 목록 페이지 */
            <div className="h-full overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white/70">로딩 중...</p>
                </div>
              ) : characters.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white/70">캐릭터가 없습니다.</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {characters.map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => handleCharacterClick(character)}
                      className="w-full text-left px-4 py-3 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                      <span className="text-sm font-medium">{character.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* 카드 필터링 페이지 */
            <div className="h-full flex flex-col">
              {/* 필터 탭 */}
              <div className="border-b border-white/10 px-4 py-2">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* 성별 필터 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 font-medium whitespace-nowrap">성별</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleGenderFilterChange(null)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          genderFilter === null
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        전체
                      </button>
                      {categoryOptions.gender.map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => handleGenderFilterChange(gender)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            genderFilter === gender
                              ? 'bg-white/20 text-white border border-white/30'
                              : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 구분선 */}
                  <div className="h-6 w-px bg-white/10" />
                  
                  {/* 속성 필터 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 font-medium whitespace-nowrap">속성</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleAttributeFilterChange(null)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          attributeFilter === null
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        전체
                      </button>
                      {categoryOptions.attribute.map((attribute) => (
                        <button
                          key={attribute}
                          type="button"
                          onClick={() => handleAttributeFilterChange(attribute)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            attributeFilter === attribute
                              ? 'bg-white/20 text-white border border-white/30'
                              : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {attribute}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 구분선 */}
                  <div className="h-6 w-px bg-white/10" />
                  
                  {/* 클래스 필터 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 font-medium whitespace-nowrap">클래스</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleTypeFilterChange(null)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          typeFilter === null
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        전체
                      </button>
                      {(() => {
                        // 클래스 목록 생성: 2뎁스만 추출
                        const classList: string[] = [];
                        if (categoryOptions.classTree.length > 0) {
                          categoryOptions.classTree.forEach((level1) => {
                            if (level1.children && level1.children.length > 0) {
                              level1.children.forEach((level2) => {
                                // 2뎁스만 추가
                                classList.push(level2.name);
                              });
                            }
                          });
                        } else if (categoryOptions.class.length > 0) {
                          classList.push(...categoryOptions.class);
                        }
                        return classList.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleTypeFilterChange(type)}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              typeFilter === type
                                ? 'bg-white/20 text-white border border-white/30'
                                : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {type}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* 카드 그리드 */}
              <div className="flex-1 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-white/70">로딩 중...</p>
                  </div>
                ) : (
                  <CardGrid
                    flowCards={cards}
                    genderFilter={genderFilter}
                    attributeFilter={attributeFilter}
                    typeFilter={typeFilter}
                    allGenders={categoryOptions.gender}
                    allAttributes={categoryOptions.attribute}
                    allClasses={categoryOptions.class}
                    classTree={categoryOptions.classTree}
                    onCardClick={handleCardClick}
                    generatingCardId={generatingCardId}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <CardDetailModal 
        flowCardId={selectedFlowCardId} 
        isOpen={isCardModalOpen} 
        onClose={handleCloseCardModal} 
        onUpdateNodes={onUpdateNodes}
        onGeneratingChange={handleGeneratingChange}
        onImageUploaded={loadCards}
        onPromptGenerated={handlePromptGenerated}
        isGenerating={
          selectedFlowCardId !== null && (
            generatingCardId === selectedFlowCardId ||
            cards.find(card => card.id === selectedFlowCardId)?.promptGenerationStatus === 'requested'
          )
        }
        flowCards={cards}
        onCardChange={(flowCardId) => {
          setSelectedFlowCardId(flowCardId);
        }}
      />
    </>
  );
}
