'use client';

import React, { useMemo } from 'react';
import ServantSlotView from './ServantSlot';
import type { ServantSlot } from '@/app/lib/heroAuto';

export interface DecagonLayoutProps {
  servants: ServantSlot[] | null;
  activeAttributePos?: number | null;
  activeClassPos?: number | null;
  isConfirmed?: boolean;
  /** 0=미공개, 1=성별만, 2=성별+속성, 3=전체. 길이 10. 없으면 전부 공개로 간주 */
  revealedSteps?: number[];
}

export default function DecagonLayout({
  servants,
  activeAttributePos = null,
  activeClassPos = null,
  isConfirmed = false,
  revealedSteps,
}: DecagonLayoutProps) {
  // 0~9 기본 슬롯 구성 (짝수=남, 홀수=여)
  const displaySlots: ServantSlot[] = useMemo(() => {
    const base: ServantSlot[] = Array.from({ length: 10 }).map((_, idx) => ({
      position: idx,
      gender: idx % 2 === 0 ? '남' : '여',
      attribute: undefined,
      type: undefined,
    }));

    if (!servants || servants.length === 0) return base;

    const byPos = new Map<number, ServantSlot>();
    for (const s of servants) {
      if (s && typeof s.position === 'number') {
        byPos.set(s.position, s);
      }
    }

    return base.map((slot) => byPos.get(slot.position) ?? slot);
  }, [servants]);

  const radiusPercent = 44; // 원 반지름 (%) — 슬롯 좌우 확대(클래스 열)에 맞춤
  const center = 50;
  const startAngle = -Math.PI / 2; // 위에서 시작
  const step = (2 * Math.PI) / 10;

  // 겹침 보정 (position 0=1번 … 9=10번): [offsetX%, offsetY%]
  // 위쪽 1·2·10번: 10·2번 내리기 + 좌우로 벌리기 / 아래쪽 5·6·7번: 5·7번 올리기 + 좌우로 벌리기
  const slotOffset: Record<number, { x: number; y: number }> = {
    1: { x: 5, y: 7 },    // 2번: 오른쪽·아래
    4: { x: 5, y: -7 },   // 5번: 오른쪽·위
    6: { x: -5, y: -7 },  // 7번: 왼쪽·위
    9: { x: -5, y: 7 },   // 10번: 왼쪽·아래
  };

  return (
    <div className="relative w-full max-h-full aspect-square mx-auto">
      {/* 10각형 배경 링 */}
      <div className="absolute inset-[12%] rounded-full border border-white/15 bg-gradient-to-br from-white/[0.08] via-slate-900/70 to-black/90 shadow-[0_0_48px_rgba(15,23,42,0.95)]" />

      {/* 슬롯들 */}
      {displaySlots.map((slot, idx) => {
        const angle = startAngle + idx * step;
        const x = center + radiusPercent * Math.cos(angle);
        const y = center + radiusPercent * Math.sin(angle);
        const offset = slotOffset[slot.position] ?? { x: 0, y: 0 };

        const isActiveAttr = activeAttributePos === slot.position;
        const isActiveCls = activeClassPos === slot.position;
        const revealedStep = revealedSteps?.[slot.position] ?? 3;

        return (
          <div
            key={slot.position}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) translate(${offset.x}%, ${offset.y}%)`,
            }}
          >
            <ServantSlotView
              slot={slot}
              isActiveAttribute={isActiveAttr}
              isActiveClass={isActiveCls}
              isConfirmed={isConfirmed}
              revealedStep={revealedStep}
            />
          </div>
        );
      })}

      {/* 중앙 장식 원 (영웅 선택 버튼 영역은 페이지에서 렌더링) */}
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/70 shadow-[0_0_40px_rgba(148,163,184,0.6)] pointer-events-none" />
    </div>
  );
}

