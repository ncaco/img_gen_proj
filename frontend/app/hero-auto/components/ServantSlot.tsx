'use client';

import React from 'react';
import type { ServantSlot } from '@/app/lib/heroAuto';

export interface ServantSlotProps {
  slot: ServantSlot;
  isActiveAttribute?: boolean;
  isActiveClass?: boolean;
  isConfirmed?: boolean;
}

function getAttributeColor(attribute?: string | null): string {
  if (!attribute) return 'rgba(148, 163, 184, 0.7)'; // slate

  const name = attribute.toLowerCase();

  // 대표적인 속성 이름에 따라 색상 매핑 (대략적인 게임 느낌)
  if (name.includes('불') || name.includes('fire')) return 'rgba(248, 113, 113, 0.9)'; // red-400
  if (name.includes('물') || name.includes('water')) return 'rgba(56, 189, 248, 0.9)'; // sky-400
  if (name.includes('땅') || name.includes('earth')) return 'rgba(251, 191, 36, 0.9)'; // amber-400
  if (name.includes('바람') || name.includes('wind')) return 'rgba(52, 211, 153, 0.9)'; // emerald-400
  if (name.includes('빛') || name.includes('light') || name.includes('star') || name.includes('천'))
    return 'rgba(250, 250, 115, 0.9)'; // yellow-300
  if (name.includes('어둠') || name.includes('dark') || name.includes('짐승') || name.includes('지'))
    return 'rgba(129, 140, 248, 0.9)'; // indigo-400

  return 'rgba(96, 165, 250, 0.9)'; // blue-400
}

function getClassIcon(type?: string | null): React.ReactNode {
  if (!type) {
    return (
      <div className="w-4 h-4 rounded-full border border-white/40" />
    );
  }

  const t = type.toLowerCase();

  // 간단한 벡터 아이콘들 (Fate 클래스 느낌)
  if (t.includes('saber')) {
    return (
      <svg className="w-4 h-4 text-sky-300" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 20L10 14M10 14L15 9L13 7L18 2L20 4L15 9M10 14L8 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (t.includes('archer')) {
    return (
      <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 19L19 5M5 5H11L5 11V5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (t.includes('lancer')) {
    return (
      <svg className="w-4 h-4 text-emerald-300" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 19L19 5M9 5H19V15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (t.includes('rider')) {
    return (
      <svg className="w-4 h-4 text-orange-300" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 18H19M7 18L10 6L14 10L17 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (t.includes('caster')) {
    return (
      <svg className="w-4 h-4 text-violet-300" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3V7M8 11L4 21L12 17L20 21L16 11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (t.includes('assassin')) {
    return (
      <svg className="w-4 h-4 text-rose-300" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 5L10 10M19 5L10 14L6 18L5 19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (t.includes('berserker')) {
    return (
      <svg className="w-4 h-4 text-red-300" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 5L10 10M19 19L14 14M5 19L10 14M19 5L14 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 기본 아이콘 (원형 마크)
  return (
    <div className="w-4 h-4 rounded-full border border-white/60" />
  );
}

export default function ServantSlotView({
  slot,
  isActiveAttribute = false,
  isActiveClass = false,
  isConfirmed = false,
}: ServantSlotProps) {
  const attrColor = getAttributeColor(slot.attribute);

  const classGlow = isActiveClass
    ? 'shadow-[0_0_18px_rgba(251,191,36,0.9)]'
    : isConfirmed
      ? 'shadow-[0_0_10px_rgba(148,163,184,0.7)]'
      : 'shadow-[0_0_6px_rgba(15,23,42,0.8)]';

  const borderGlow = isActiveAttribute
    ? `0 0 18px ${attrColor}`
    : isConfirmed
      ? `0 0 10px ${attrColor}`
      : '0 0 4px rgba(15,23,42,0.9)';

  const genderLabel = slot.gender === '여' ? 'F' : 'M';

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-[#05050b]/80 backdrop-blur-sm px-2 py-2 transition-transform duration-200 ${
        isActiveAttribute || isActiveClass ? 'scale-105' : 'scale-100'
      } ${classGlow}`}
      style={{
        boxShadow: borderGlow,
      }}
    >
      <div className="flex items-center gap-1 mb-1">
        <div
          className={`w-5 h-5 rounded-full border border-white/40 flex items-center justify-center text-[10px] font-semibold ${
            slot.gender === '여' ? 'bg-pink-500/40 text-pink-50' : 'bg-sky-500/40 text-sky-50'
          }`}
        >
          {genderLabel}
        </div>
        <div className="text-[10px] text-white/70">
          #{slot.position + 1}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="min-h-[14px] text-[10px] text-amber-100/90 truncate max-w-[72px]">
          {slot.attribute || '-'}
        </div>
        <div className="flex items-center justify-center mt-0.5">
          {getClassIcon(slot.type)}
        </div>
        <div className="min-h-[14px] text-[10px] text-sky-100/80 truncate max-w-[72px] mt-0.5">
          {slot.type || '-'}
        </div>
      </div>
    </div>
  );
}

