'use client';

import React from 'react';

interface CardData {
  characterImage?: string;
  backgroundImage?: string;
  cardName?: string;
  type?: string;
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

  const typeDisplay = typeData || '타입';

  return (
    <div className="relative w-[400px] rounded-lg overflow-hidden shadow-2xl border-2 border-gray-300 aspect-[1024/1536]" data-card-preview="true">
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
        {/* 상단 헤더 + 희귀도 배지 영역 */}
        <div className="relative mb-2">
          {/* 상단 헤더 영역 (투명 배경 오버레이) */}
          <div className="flex items-center justify-between px-2 py-1 bg-black/40 backdrop-blur-sm rounded">
            {/* 타입 (왼쪽 상단 동그라미) */}
            <div
              className="min-w-[60px] h-10 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold text-gray-800 border-2 border-gray-600 overflow-hidden px-2"
              title={
                typeof typeData === 'object'
                  ? JSON.stringify(typeData, null, 2)
                  : typeDisplay
              }
            >
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                {typeDisplay}
              </span>
            </div>

            {/* 카드명 (중앙) */}
            <div className="flex-1 text-center mx-2">
              <span className="text-white font-bold text-lg">{cardName}</span>
            </div>

            {/* 속성 (오른쪽 상단 동그라미) */}
            <div className="min-w-[60px] h-10 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold text-gray-800 border-2 border-gray-600 overflow-hidden px-2">
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                {attribute}
              </span>
            </div>
          </div>

          {/* 헤더와 이미지 사이 중앙의 희귀도 6각형 배지 */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
            <div
              className="px-6 py-1 shadow-md flex items-center justify-center text-sm"
              style={{
                clipPath:
                  'polygon(0% 50%, 6% 0%, 94% 0%, 100% 50%, 94% 100%, 6% 100%)',
              }}
            >
              <span className="text-yellow-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {rarity}
              </span>
            </div>
          </div>
        </div>

        {/* 이미지 영역 - 고정 높이 + background-image 사용 (html2canvas와 렌더링 일치) */}
        <div
          className="relative rounded overflow-hidden bg-black h-[260px] bg-center bg-no-repeat"
          style={
            characterImage
              ? {
                  backgroundImage: `url(${characterImage})`,
                  backgroundSize: 'contain',
                }
              : undefined
          }
        >
          {!characterImage && (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
              캐릭터 이미지
            </div>
          )}
        </div>

        {/* 구분선 */}
        <div className="h-px bg-white/30 my-2" />

        {/* 스킬 영역 (투명 배경 오버레이) */}
        <div className="space-y-2">
          {/* 스킬 1 */}
          <div className="bg-black/40 backdrop-blur-sm rounded px-3 py-1 min-h-[56px] flex flex-col justify-center">
            <div className="text-white font-semibold text-sm leading-tight">
              [스킬 1] {skill1?.name || '스킬명'}
            </div>
            <div className="text-white/90 text-xs leading-tight mt-0.5">
              • {skill1?.description || '효과 설명'}
            </div>
          </div>

          {/* 스킬 2 */}
          <div className="bg-black/40 backdrop-blur-sm rounded px-3 py-1 min-h-[56px] flex flex-col justify-center">
            <div className="text-white font-semibold text-sm leading-tight">
              [스킬 2] {skill2?.name || '스킬명'}
            </div>
            <div className="text-white/90 text-xs leading-tight mt-0.5">
              • {skill2?.description || '효과 설명'}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-px bg-white/30 my-2" />

        {/* 하단 설명 영역 (투명 배경 오버레이) */}
        <div className="bg-black/40 backdrop-blur-sm rounded px-3 py-1 mb-2 flex items-center min-h-[48px]">
          <p className="text-white/90 text-xs italic leading-tight">
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
