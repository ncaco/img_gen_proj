'use client';

import React from 'react';
import type { FlowCard } from '@/app/lib/flow';
import type { CategoryTreeNode } from '@/app/lib/category';

interface CardGridProps {
  flowCards?: FlowCard[];
  cards?: never; // 레거시 지원 제거
  emptyCount?: number;
  genderFilter?: string | null;
  attributeFilter?: string | null;
  typeFilter?: string | null;
  allGenders?: string[];
  allAttributes?: string[];
  allClasses?: string[];
  classTree?: CategoryTreeNode[];
  onCardClick?: (flowCardId: number | null) => void;
  generatingCardId?: number | null;
}

export default function CardGrid({
  flowCards = [],
  emptyCount = 20,
  genderFilter,
  attributeFilter,
  typeFilter,
  allGenders = [],
  allAttributes = [],
  allClasses = [],
  classTree = [],
  onCardClick,
  generatingCardId = null,
}: CardGridProps) {
  // 클래스 목록 생성: 2뎁스만 추출
  const classList: string[] = [];
  if (classTree.length > 0) {
    classTree.forEach((level1) => {
      if (level1.children && level1.children.length > 0) {
        level1.children.forEach((level2) => {
          // 2뎁스만 추가
          classList.push(level2.name);
        });
      }
    });
  } else if (allClasses.length > 0) {
    // classTree가 없으면 allClasses 사용
    classList.push(...allClasses);
  }

  // 빈 카드 플레이스홀더: 선택된 필터의 모든 조합 생성
  // 실제 카드가 있어도 빈 플레이스홀더 형태로만 표시
  const genders = genderFilter ? [genderFilter] : allGenders;
  const attributes = attributeFilter ? [attributeFilter] : allAttributes;
  const types = typeFilter ? [typeFilter] : classList;

  // 카르테시안 곱: 모든 조합 생성
  const combinations: Array<{ gender: string; attribute: string; type: string }> = [];
  genders.forEach((gender) => {
    attributes.forEach((attribute) => {
      types.forEach((type) => {
        combinations.push({ gender, attribute, type });
      });
    });
  });

  // 실제 카드가 있으면 카드 정보를 조합 형태로 변환
  let displayItems: Array<{ gender: string; attribute: string; type: string; flowCardId?: number } | null> = [];
  
  if (flowCards.length > 0) {
    // 실제 카드가 있으면 카드의 필터 정보를 조합 형태로 표시
    displayItems = flowCards.map((card) => ({
      gender: card.gender || '전체',
      attribute: card.attribute || '전체',
      type: card.type || '전체',
      flowCardId: card.id, // FlowCard id 포함
    }));
  } else if (combinations.length > 0) {
    // 빈 카드 플레이스홀더: 선택된 필터의 모든 조합 (flowCardId 없음)
    displayItems = combinations.map((combo) => ({
      ...combo,
      flowCardId: undefined, // 명시적으로 flowCardId 없음
    }));
  } else {
    // 조합이 없으면 빈 플레이스홀더
    displayItems = Array.from({ length: emptyCount }, () => null);
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="grid grid-cols-5 gap-2 p-4">
        {displayItems.map((item, index) => {
          if (!item) {
            // 빈 카드 플레이스홀더 (조합이 없을 때)
            return (
              <div
                key={`empty-${index}`}
                className="aspect-[5/7] w-full flex flex-col items-center justify-center border border-white/20 bg-white/5 rounded overflow-hidden"
              >
                <div className="text-white/60 text-xs font-medium text-center px-2">
                  <div>전체</div>
                  <div className="text-white/40">*</div>
                  <div>전체</div>
                  <div className="text-white/40">*</div>
                  <div>전체</div>
                </div>
              </div>
            );
          }

          // 조합 정보 표시
          const { gender, attribute, type, flowCardId } = item;
          const itemKey = flowCardId ? `flowCard-${flowCardId}` : `combo-${gender}-${attribute}-${type}-${index}`;
          
          // 클릭 핸들러가 있으면 모두 클릭 가능 (카드가 없어도)
          const handleClick = onCardClick
            ? (e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                e.preventDefault();
                // FlowCard id가 있으면 전달, 없으면 null 전달
                if (flowCardId) {
                  onCardClick(flowCardId);
                } else {
                  // 빈 플레이스홀더 클릭 시에도 핸들러 호출 (flowCardId가 null)
                  onCardClick(null);
                }
              }
            : undefined;

          // 카드 데이터 찾기 (flowCardId가 있으면 flowCards에서 찾기)
          const cardData = flowCardId && flowCards.length > 0 
            ? flowCards.find(card => card.id === flowCardId)
            : undefined;
          const cardImageUrl = cardData?.imageUrl;
          const hasPrompt = cardData?.prompt ? true : false;
          const isGenerating = flowCardId !== null && generatingCardId === flowCardId;
          
          // 이미지가 있으면 1:1 비율
          const aspectRatio = cardImageUrl ? 'aspect-[1/1]' : 'aspect-[1/1]';

          return (
            <div
              key={itemKey}
              onClick={handleClick}
              className={`${aspectRatio} w-full flex items-center justify-center border border-white/20 bg-white/5 rounded overflow-hidden relative ${
                onCardClick && !isGenerating ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''
              } ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
            >
              {/* 로딩 오버레이 */}
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 rounded">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-white text-xs">생성 중...</span>
                  </div>
                </div>
              )}
              {/* 상태 아이콘들 */}
              {(hasPrompt || cardImageUrl) && (
                <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
                  {cardImageUrl && (
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  )}
                  {hasPrompt && (
                    <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
              
              {cardImageUrl ? (
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}${cardImageUrl}`}
                  alt={`${gender} / ${attribute} / ${type}`}
                  className="w-full h-full object-contain scale-100"
                />
              ) : (
                <div className="text-white/60 text-xs font-medium text-center px-2">
                  <div>{gender}</div>
                  <div className="text-white/40">*</div>
                  <div>{attribute}</div>
                  <div className="text-white/40">*</div>
                  <div>{type}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
