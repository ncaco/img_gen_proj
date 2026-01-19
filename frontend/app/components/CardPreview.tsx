'use client';

import React from 'react';

interface TypeData {
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
}

interface CardData {
  characterImage?: string;
  backgroundImage?: string;
  cardName?: string;
  type?: TypeData | string;
  attribute?: string;
  rarity?: string;
  attack?: string;
  health?: string;
  skill1?: {
    name: string;
    description: string;
  };
  skill2?: {
    name: string;
    description: string;
  };
  flavorText?: string;
  cardNumber?: string;
  series?: string;
}

interface CardPreviewProps {
  cardData: CardData;
}

export default function CardPreview({ cardData }: CardPreviewProps) {
  const {
    characterImage,
    backgroundImage,
    cardName = '카드명',
    type: typeData = '타입',
    attribute = '속성',
    rarity = '⭐⭐',
    attack = '0',
    health = '0',
    skill1,
    skill2,
    flavorText = '카드 설명이 여기에 표시됩니다.',
    cardNumber = '#000',
    series = '시리즈명',
  } = cardData;

  // 타입 표시값 계산 (가장 상세한 분류 표시)
  const getTypeDisplay = () => {
    if (typeof typeData === 'string') {
      return typeData;
    }
    if (typeData.species) return typeData.species;
    if (typeData.genus) return typeData.genus;
    if (typeData.family) return typeData.family;
    if (typeData.order) return typeData.order;
    if (typeData.class) return typeData.class;
    if (typeData.phylum) return typeData.phylum;
    if (typeData.kingdom) return typeData.kingdom;
    return '타입';
  };

  const typeDisplay = getTypeDisplay();

  return (
    <div className="relative w-[400px] h-[560px] rounded-lg overflow-hidden shadow-2xl border-2 border-gray-300" data-card-preview="true">
      {/* Layer 2: 배경 이미지 (전체 영역) */}
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600" />
      )}

      {/* 내부 컨텐츠 영역 */}
      <div className="relative h-full flex flex-col p-4">
        {/* 상단 헤더 영역 (투명 배경 오버레이) */}
        <div className="flex items-center justify-between mb-2 px-2 py-1 bg-black/40 backdrop-blur-sm rounded">
          {/* 타입 (왼쪽 상단 동그라미) */}
          <div className="min-w-[60px] h-10 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold text-gray-800 border-2 border-gray-600 overflow-hidden px-2" title={typeof typeData === 'object' ? JSON.stringify(typeData, null, 2) : typeDisplay}>
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              {typeDisplay}
            </span>
          </div>

          {/* 카드명과 등급 */}
          <div className="flex-1 text-center mx-2">
            <span className="text-white text-sm mr-2">{rarity}</span>
            <span className="text-white font-bold text-lg">{cardName}</span>
          </div>

          {/* 속성 (오른쪽 상단 동그라미) */}
          <div className="min-w-[60px] h-10 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold text-gray-800 border-2 border-gray-600 overflow-hidden px-2">
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              {attribute}
            </span>
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-px bg-white/30 my-2" />

        {/* 이미지 영역 */}
        <div className="flex-1 relative mb-2 rounded overflow-hidden bg-black/20">
          {characterImage ? (
            <img
              src={characterImage}
              alt="캐릭터"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
              캐릭터 이미지
            </div>
          )}
        </div>

        {/* 구분선 */}
        <div className="h-px bg-white/30 my-2" />

        {/* 스킬 영역 (투명 배경 오버레이) */}
        <div className="space-y-2 mb-2">
          <div className="bg-black/40 backdrop-blur-sm rounded p-2">
            <div className="text-white font-semibold text-sm mb-1">
              [스킬 1] {skill1?.name || '스킬명'}
            </div>
            <div className="text-white/90 text-xs">• {skill1?.description || '효과 설명'}</div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded p-2">
            <div className="text-white font-semibold text-sm mb-1">
              [스킬 2] {skill2?.name || '스킬명'}
            </div>
            <div className="text-white/90 text-xs">• {skill2?.description || '효과 설명'}</div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-px bg-white/30 my-2" />

        {/* 하단 설명 영역 (투명 배경 오버레이) */}
        <div className="bg-black/40 backdrop-blur-sm rounded p-2 mb-2">
          <p className="text-white/90 text-xs italic leading-relaxed">
            &ldquo;{flavorText}&rdquo;
          </p>
        </div>

        {/* 공격력/체력 표시 (투명 배경 오버레이) */}
        <div className="bg-black/40 backdrop-blur-sm rounded px-3 py-2 mb-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-white/90 font-bold text-lg">⚔️ {attack}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/90 font-bold text-lg">❤️ {health}</span>
          </div>
        </div>

        {/* 하단 메타 정보 (투명 배경 오버레이) */}
        <div className="bg-black/40 backdrop-blur-sm rounded px-2 py-1 flex justify-between items-center">
          <span className="text-white/80 text-xs">{cardNumber}</span>
          <span className="text-white/80 text-xs">{series}</span>
        </div>
      </div>
    </div>
  );
}
