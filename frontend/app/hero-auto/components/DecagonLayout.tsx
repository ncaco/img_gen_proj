'use client';

import React, { useMemo } from 'react';
import ServantSlotView from './ServantSlot';
import type { ServantSlot } from '@/app/lib/heroAuto';

export interface DecagonLayoutProps {
  servants: ServantSlot[] | null;
  activeAttributePos?: number | null;
  activeClassPos?: number | null;
  isConfirmed?: boolean;
}

export default function DecagonLayout({
  servants,
  activeAttributePos = null,
  activeClassPos = null,
  isConfirmed = false,
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

  const radiusPercent = 38; // 원 반지름 (%)
  const center = 50;
  const startAngle = -Math.PI / 2; // 위에서 시작
  const step = (2 * Math.PI) / 10;

  return (
    <div className="relative w-full max-w-[460px] aspect-square mx-auto">
      {/* 10각형 배경 링 */}
      <div className="absolute inset-[12%] rounded-full border border-white/10 bg-gradient-to-br from-white/5 via-slate-900/60 to-black/80 shadow-[0_0_40px_rgba(15,23,42,0.9)]" />

      {/* 슬롯들 */}
      {displaySlots.map((slot, idx) => {
        const angle = startAngle + idx * step;
        const x = center + radiusPercent * Math.cos(angle);
        const y = center + radiusPercent * Math.sin(angle);

        const isActiveAttr = activeAttributePos === slot.position;
        const isActiveCls = activeClassPos === slot.position;

        return (
          <div
            key={slot.position}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <ServantSlotView
              slot={slot}
              isActiveAttribute={isActiveAttr}
              isActiveClass={isActiveCls}
              isConfirmed={isConfirmed}
            />
          </div>
        );
      })}

      {/* 중앙 장식 원 (영웅 선택 버튼 영역은 페이지에서 렌더링) */}
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 shadow-[0_0_32px_rgba(148,163,184,0.75)] pointer-events-none" />
    </div>
  );
}

