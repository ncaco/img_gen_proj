'use client';

import React, { useCallback, useState } from 'react';
import DecagonLayout from './components/DecagonLayout';
import HeroSelectModal from './components/HeroSelectModal';
import DistributionModal, { type RouletteDirection } from './components/DistributionModal';
import type { FlowCharacter } from '@/app/lib/flow';
import {
  createHeroAutoPool,
  distributeHeroAutoPool,
  confirmHeroAutoPool,
  regenerateHeroAutoPool,
  type HeroAutoPool,
} from '@/app/lib/heroAuto';

export default function HeroAutoPage() {
  const [selectedHero, setSelectedHero] = useState<FlowCharacter | null>(null);
  const [pool, setPool] = useState<HeroAutoPool | null>(null);
  const [creatingPool, setCreatingPool] = useState(false);

  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);
  const [activeAttrPos, setActiveAttrPos] = useState<number | null>(null);
  const [activeClassPos, setActiveClassPos] = useState<number | null>(null);
  /** 0=미공개, 1=성별만, 2=성별+속성, 3=전체 (성별+속성+클래스) */
  const [revealedSteps, setRevealedSteps] = useState<number[]>(() => Array(10).fill(3));

  const [progressPhase, setProgressPhase] = useState<'gender' | 'attr' | 'class' | null>(null);
  const [progressStep, setProgressStep] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);

  const ensurePoolForHero = useCallback(
    async (character: FlowCharacter): Promise<HeroAutoPool> => {
      if (pool && pool.characterId === character.id) return pool;
      setCreatingPool(true);
      try {
        const created = await createHeroAutoPool({ characterId: character.id });
        setPool(created);
        return created;
      } finally {
        setCreatingPool(false);
      }
    },
    [pool],
  );

  const handleSelectHero = async (hero: FlowCharacter) => {
    try {
      setError(null);
      setSelectedHero(hero);
      const created = await ensurePoolForHero(hero);
      setPool(created);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '영웅 선택 또는 풀오토 생성 중 오류가 발생했습니다.',
      );
    }
  };

  const handleOpenDistribution = () => {
    if (!selectedHero || !pool || pool.isConfirmed) return;
    setIsDistModalOpen(true);
  };

  const runAnimationSequence = useCallback((direction: RouletteDirection) => {
    return (async () => {
      setIsAnimating(true);
      setActiveAttrPos(null);
      setActiveClassPos(null);
      setProgressPhase(null);
      setProgressStep(0);
      setRevealedSteps(Array(10).fill(0));

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // 시계방향 = 0→1→…→9, 반시계 = 9→…→0
      const clockwiseOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const order = direction === 'cw' ? clockwiseOrder : [...clockwiseOrder].reverse();

      // 1회전: 성별 공개
      let step = 0;
      setProgressPhase('gender');
      setProgressStep(0);
      for (const idx of order) {
        setActiveAttrPos(idx);
        setActiveClassPos(null);
        setRevealedSteps((prev) => {
          const next = [...prev];
          next[idx] = 1;
          return next;
        });
        setProgressStep(step);
        step += 1;
        await delay(500);
      }
      setActiveAttrPos(null);

      // 2회전: 속성 공개
      step = 0;
      setProgressPhase('attr');
      setProgressStep(0);
      for (const idx of order) {
        setActiveAttrPos(idx);
        setActiveClassPos(null);
        setRevealedSteps((prev) => {
          const next = [...prev];
          next[idx] = 2;
          return next;
        });
        setProgressStep(step);
        step += 1;
        await delay(500);
      }
      setActiveAttrPos(null);

      // 3회전: 클래스 공개
      step = 0;
      setProgressPhase('class');
      setProgressStep(0);
      for (const idx of order) {
        setActiveAttrPos(null);
        setActiveClassPos(idx);
        setRevealedSteps((prev) => {
          const next = [...prev];
          next[idx] = 3;
          return next;
        });
        setProgressStep(step);
        step += 1;
        await delay(500);
      }
      setActiveClassPos(null);

      setProgressPhase(null);
      setProgressStep(0);
      setIsAnimating(false);
    })();
  }, []);

  const handleExecuteDistribution = async (options: {
    attributeStartGender: string;
    classStartGender: string;
    rouletteDirection: RouletteDirection;
  }) => {
    if (!selectedHero) return;
    try {
      setError(null);
      const currentPool = await ensurePoolForHero(selectedHero);
      setIsDistModalOpen(false);

      const res = await distributeHeroAutoPool(currentPool.id, {
        attributeStartGender: options.attributeStartGender,
        classStartGender: options.classStartGender,
      });
      setPool(res.pool);
      void runAnimationSequence(options.rouletteDirection);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '자동 배분 실행 중 오류가 발생했습니다.',
      );
      setIsAnimating(false);
    }
  };

  const handleConfirm = async () => {
    if (!pool || pool.isConfirmed) return;
    try {
      setError(null);
      const res = await confirmHeroAutoPool(pool.id);
      setPool(res.pool);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '확정 처리 중 오류가 발생했습니다.',
      );
    }
  };

  const handleRegenerate = async () => {
    if (!pool || pool.isConfirmed || !selectedHero) return;
    try {
      setError(null);
      await regenerateHeroAutoPool(pool.id);
      const res = await distributeHeroAutoPool(pool.id, {
        attributeStartGender: '남',
        classStartGender: '여',
      });
      setPool(res.pool);
      void runAnimationSequence('cw');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '재생성 중 오류가 발생했습니다.',
      );
      setIsAnimating(false);
    }
  };

  const hasServants = !!pool && pool.servants && pool.servants.length > 0;

  const lockScreen = isAnimating || creatingPool;

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-gradient-to-b from-[#050510] via-[#050712] to-black text-white">
      <div className="relative flex-1 flex flex-col min-h-0 w-full max-w-[1920px] mx-auto px-3 sm:px-4 py-3">
        {/* 상단: 제목 + 영웅 + 상태 뱃지 (한 줄) */}
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-lg sm:text-xl font-semibold text-white">영웅 풀오토</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-full border border-white/20 bg-gradient-to-br from-indigo-500/60 to-purple-500/40 flex items-center justify-center text-xs font-semibold">
              {selectedHero ? selectedHero.name[0] : '?'}
            </div>
            <div>
              <div className="text-[10px] text-white/60">선택된 영웅</div>
              <div className="text-xs font-medium leading-tight">
                {selectedHero ? selectedHero.name : '없음'}
              </div>
            </div>
            {hasServants && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  pool?.isConfirmed
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                    : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40'
                }`}
              >
                {pool?.isConfirmed ? '확정 완료' : '배분 완료'}
              </span>
            )}
            {lockScreen && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-white/10 text-white/80 border border-white/25">
                연출 중...
              </span>
            )}
          </div>
        </div>

        {/* 10각형 영역: 화면 안에 스크롤 없이 맞춤, 가운데 정렬 */}
        <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center py-1 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center min-w-0 min-h-0 max-w-[90vmin] max-h-[90vmin]">
            <DecagonLayout
              servants={pool?.servants ?? null}
              activeAttributePos={activeAttrPos}
              activeClassPos={activeClassPos}
              isConfirmed={!!pool?.isConfirmed}
              revealedSteps={revealedSteps}
            />
          </div>

          {/* 진행 상태 */}
          {progressPhase && (
            <div className="flex-shrink-0 mt-1 text-[10px] text-white/70">
              {progressPhase === 'gender' && `1회전 성별 (${Math.min(progressStep + 1, 10)} / 10)`}
              {progressPhase === 'attr' && `2회전 속성 (${Math.min(progressStep + 1, 10)} / 10)`}
              {progressPhase === 'class' && `3회전 클래스 (${Math.min(progressStep + 1, 10)} / 10)`}
            </div>
          )}

          {/* 중앙 버튼 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 pointer-events-none">
            <button
              type="button"
              onClick={() => setIsHeroModalOpen(true)}
              disabled={lockScreen || !!pool?.isConfirmed}
              className="pointer-events-auto inline-flex items-center justify-center rounded-full border-2 border-white/50 bg-black/80 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(129,140,248,0.8)] hover:bg-white/15 hover:border-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {selectedHero ? '영웅 변경' : '영웅 선택'}
            </button>
            {hasServants && !pool?.isConfirmed && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={lockScreen}
                className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-indigo-400/60 bg-indigo-600/80 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-indigo-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                재생성
              </button>
            )}
            {!hasServants && selectedHero && !pool?.isConfirmed && (
              <button
                type="button"
                onClick={handleOpenDistribution}
                disabled={lockScreen}
                className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-indigo-400/60 bg-indigo-600/80 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-indigo-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                랜덤생성
              </button>
            )}
          </div>
        </div>

        {/* 하단: 안내 + 버튼 */}
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-white/15">
          <p className="text-[11px] text-white/60 max-w-[60%]">
            속성: 남→여→남→여 / 클래스: 여→남→여→남 순으로 배분
          </p>
          <div className="flex items-center gap-1.5">
            {selectedHero && !pool?.isConfirmed && (
              <button
                type="button"
                onClick={handleOpenDistribution}
                disabled={lockScreen}
                className="inline-flex items-center justify-center rounded-lg border border-indigo-400/60 bg-indigo-600/80 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-indigo-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {hasServants ? '다시 배분' : '랜덤 배분'}
              </button>
            )}
            {hasServants && !pool?.isConfirmed && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={lockScreen}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[10px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                확정
              </button>
            )}
          </div>
        </div>

        {/* 에러 (한 줄) */}
        {error && (
          <div className="flex-shrink-0 mt-1.5 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 truncate">
            {error}
          </div>
        )}

        {/* 연출 중 전체 잠금 오버레이 */}
        {lockScreen && (
          <div className="absolute inset-0 z-20 pointer-events-auto" aria-hidden="true" />
        )}
      </div>

      <HeroSelectModal
        isOpen={isHeroModalOpen}
        onClose={() => setIsHeroModalOpen(false)}
        onSelect={handleSelectHero}
      />
      <DistributionModal
        isOpen={isDistModalOpen}
        onClose={() => setIsDistModalOpen(false)}
        onConfirm={handleExecuteDistribution}
      />
    </div>
  );
}

