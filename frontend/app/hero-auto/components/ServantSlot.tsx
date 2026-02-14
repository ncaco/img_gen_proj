'use client';

import React from 'react';
import {
  IoFlame,
  IoWater,
  IoLeaf,
  IoFlash,
  IoMoon,
  IoSnow,
  IoSparkles,
  IoMale,
  IoFemale,
  IoHelpCircle,
} from 'react-icons/io5';
import { FiWind } from 'react-icons/fi';
import { MdTerrain, MdAcUnit } from 'react-icons/md';
import {
  GiCrossedSwords,
  GiBowArrow,
  GiSpearHook,
  GiHorseHead,
  GiWizardStaff,
  GiDaggers,
  GiBroadDagger,
  GiCrown,
  GiAngryEyes,
  GiSplitCross,
  GiMetalBar,
} from 'react-icons/gi';
import type { ServantSlot } from '@/app/lib/heroAuto';

export interface ServantSlotProps {
  slot: ServantSlot;
  isActiveAttribute?: boolean;
  isActiveClass?: boolean;
  isConfirmed?: boolean;
  /** 0=미공개, 1=성별만, 2=성별+속성, 3=전체. 없으면 3(전체 공개) */
  revealedStep?: number;
}

function getAttributeColor(attribute?: string | null): string {
  if (!attribute) return 'rgba(148, 163, 184, 0.7)'; // slate

  const name = attribute.toLowerCase();

  // 속성별 색상 (불-적, 물-청, 흙-갈, 바람-흰, 빛-노랑, 강설-은, 얼음-하늘, 자연-초록, 번개-보라, 어둠-검정)
  if (name.includes('불') || name.includes('fire')) return 'rgba(239, 68, 68, 0.9)'; // 적색
  if (name.includes('물') || name.includes('water')) return 'rgba(59, 130, 246, 0.9)'; // 청색
  if (name.includes('흙') || name.includes('땅') || name.includes('earth')) return 'rgba(180, 83, 9, 0.9)'; // 갈색
  if (name.includes('바람') || name.includes('wind')) return 'rgba(255, 255, 255, 0.95)'; // 흰색
  if (name.includes('빛') || name.includes('light') || name.includes('star') || name.includes('천'))
    return 'rgba(250, 204, 21, 0.9)'; // 노란색
  if (name.includes('금속') || name.includes('metal')) return 'rgba(148, 163, 184, 0.9)'; // 은/회색
  if (name.includes('강설') || name.includes('snow')) return 'rgba(203, 213, 225, 0.9)'; // 은색
  if (name.includes('얼음') || name.includes('ice')) return 'rgba(125, 211, 252, 0.9)'; // 하늘색
  if (name.includes('자연') || name.includes('nature')) return 'rgba(34, 197, 94, 0.9)'; // 초록색
  if (name.includes('번개') || name.includes('lightning') || name.includes('thunder'))
    return 'rgba(168, 85, 247, 0.9)'; // 번개: 보라색
  if (name.includes('어둠') || name.includes('dark') || name.includes('짐승') || name.includes('지'))
    return 'rgba(30, 41, 59, 0.95)'; // 검은색(어두운 회색)

  return 'rgba(148, 163, 184, 0.9)'; // 미매칭 시 슬레이트
}

const ICON_CLASS = 'w-5 h-5 flex-shrink-0';

/** 속성별 아이콘 (react-icons, 색상은 getAttributeColor로 적용) */
function getAttributeIcon(attribute?: string | null): React.ReactNode {
  const color = getAttributeColor(attribute);
  const style = { color };
  if (!attribute) {
    return <div className={`${ICON_CLASS} rounded border border-white/40 bg-white/10`} aria-hidden />;
  }
  const name = attribute.toLowerCase();

  if (name.includes('불') || name.includes('fire')) return <IoFlame className={ICON_CLASS} style={style} />;
  if (name.includes('물') || name.includes('water')) return <IoWater className={ICON_CLASS} style={style} />;
  if (name.includes('흙') || name.includes('땅') || name.includes('earth')) return <MdTerrain className={ICON_CLASS} style={style} />;
  if (name.includes('바람') || name.includes('wind')) return <FiWind className={ICON_CLASS} style={style} />;
  if (name.includes('빛') || name.includes('light') || name.includes('star') || name.includes('천')) return <IoSparkles className={ICON_CLASS} style={style} />;
  if (name.includes('금속') || name.includes('metal')) return <GiMetalBar className={ICON_CLASS} style={style} />;
  if (name.includes('강설') || name.includes('snow')) return <IoSnow className={ICON_CLASS} style={style} />;
  if (name.includes('얼음') || name.includes('ice')) return <MdAcUnit className={ICON_CLASS} style={style} />;
  if (name.includes('자연') || name.includes('nature')) return <IoLeaf className={ICON_CLASS} style={style} />;
  if (name.includes('번개') || name.includes('lightning') || name.includes('thunder')) return <IoFlash className={ICON_CLASS} style={style} />;
  if (name.includes('어둠') || name.includes('dark') || name.includes('짐승') || name.includes('지')) return <IoMoon className={ICON_CLASS} style={style} />;

  return <div className={`${ICON_CLASS} rounded-full border border-white/40`} style={{ backgroundColor: color }} aria-hidden />;
}

/** "부모 · 3뎁스클래스" 형식이면 3뎁스 이름만 추출, 아니면 원문 사용 */
function normalizeClassNameForIcon(type?: string | null): string {
  if (!type || typeof type !== 'string') return '';
  const trimmed = type.trim();
  if (trimmed.includes(' · ')) {
    const last = trimmed.split(' · ').pop()?.trim();
    return last ?? trimmed;
  }
  return trimmed;
}

const CLASS_ICON = 'w-5 h-5 flex-shrink-0';

function getClassIcon(type?: string | null): React.ReactNode {
  const raw = normalizeClassNameForIcon(type);
  if (!raw) return <div className={`${CLASS_ICON} rounded-full border border-white/40`} />;

  const t = raw.toLowerCase();
  if (t.includes('saber') || t.includes('세이버')) return <GiCrossedSwords className={`${CLASS_ICON} text-sky-300`} />;
  if (t.includes('archer') || t.includes('아처')) return <GiBowArrow className={`${CLASS_ICON} text-amber-300`} />;
  if (t.includes('lancer') || t.includes('랜서')) return <GiSpearHook className={`${CLASS_ICON} text-emerald-300`} />;
  if (t.includes('rider') || t.includes('라이더')) return <GiHorseHead className={`${CLASS_ICON} text-orange-300`} />;
  if (t.includes('caster') || t.includes('캐스터')) return <GiWizardStaff className={`${CLASS_ICON} text-violet-300`} />;
  if (t.includes('assassin') || t.includes('어새신')) return <GiDaggers className={`${CLASS_ICON} text-rose-300`} />;
  if (t.includes('berserker') || t.includes('버서커')) return <GiBroadDagger className={`${CLASS_ICON} text-red-300`} />;
  if (t.includes('ruler') || t.includes('룰러')) return <GiCrown className={`${CLASS_ICON} text-yellow-300`} />;
  if (t.includes('avenger') || t.includes('어벤저')) return <GiAngryEyes className={`${CLASS_ICON} text-orange-400`} />;
  if (t.includes('alter') || t.includes('얼터에고') || t.includes('얼터 에고') || (t.includes('얼터') && t.includes('에고')) || t.includes('ego')) return <GiSplitCross className={`${CLASS_ICON} text-fuchsia-300`} />;

  return <div className={`${CLASS_ICON} rounded-full border border-white/60`} />;
}

export default function ServantSlotView({
  slot,
  isActiveAttribute = false,
  isActiveClass = false,
  isConfirmed = false,
  revealedStep = 3,
}: ServantSlotProps) {
  const attrColor = getAttributeColor(slot.attribute);
  const showGender = revealedStep >= 1;
  const showAttribute = revealedStep >= 2;
  const showClass = revealedStep >= 3;

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

  const genderLabel = showGender ? (slot.gender === '여' ? 'F' : 'M') : '?';
  const attributeLabel = showAttribute ? (slot.attribute || '-') : '-';
  const classLabel = showClass ? (slot.type || '-') : '-';

  const slotNumber = slot.position + 1;

  const GenderIcon = showGender
    ? slot.gender === '여'
      ? IoFemale
      : IoMale
    : IoHelpCircle;

  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-[#0a0a12]/90 backdrop-blur-sm overflow-hidden transition-transform duration-200 w-full max-w-[300px] ${
        isActiveAttribute || isActiveClass
          ? 'scale-105 border-indigo-400/40'
          : 'border-white/25'
      } ${classGlow}`}
      style={{
        boxShadow: borderGlow,
        minWidth: 'clamp(150px, 22vw, 300px)',
      }}
    >
      <div className="border-x border-white/30">
        <div className="text-[10px] text-white/70 font-semibold px-2 py-2 border-b border-white/25 grid grid-cols-[2rem_minmax(4rem,auto)_minmax(4.5rem,auto)_minmax(0,1fr)] gap-2 w-full text-center bg-white/[0.06]">
          <span className="truncate border-r border-white/25 py-0.5">번호</span>
          <span className="truncate border-r border-white/25 py-0.5">성별</span>
          <span className="truncate border-r border-white/25 py-0.5">속성</span>
          <span className="truncate py-0.5 text-left pl-1">클래스</span>
        </div>
        <div className="grid grid-cols-[2rem_minmax(4rem,auto)_minmax(4.5rem,auto)_minmax(0,1fr)] gap-2 px-0 py-3 text-[11px] w-full text-center bg-white/[0.02]">
          <div className="flex items-center justify-center min-w-0 font-semibold text-white/90 border-r border-white/25 py-2 w-8">
            {slotNumber}
          </div>
          <div className="flex items-center justify-center gap-1.5 min-w-0 border-r border-white/25 py-2">
            <span
              className={`flex items-center justify-center rounded-full border border-white/40 flex-shrink-0 text-[10px] font-bold w-6 h-6 ${
                showGender
                  ? slot.gender === '여'
                    ? 'bg-pink-500/40 text-pink-50'
                    : 'bg-sky-500/40 text-sky-50'
                  : 'bg-white/20 text-white/50'
              }`}
            >
              <GenderIcon className="w-3.5 h-3.5" />
            </span>
            <span className="truncate text-white/90">{genderLabel}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 min-w-0 border-r border-white/25 py-2">
            {showAttribute ? getAttributeIcon(slot.attribute) : <div className="w-5 h-5 rounded border border-white/40 flex-shrink-0 bg-white/10" />}
            <span className="truncate text-amber-100/90">{attributeLabel}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 min-w-0 py-2 text-left pl-2">
            {showClass ? getClassIcon(slot.type) : <div className="w-5 h-5 rounded-full border border-white/40 flex-shrink-0" />}
            <span className="truncate text-sky-100/80 min-w-0">{classLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

