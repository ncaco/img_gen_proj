'use client';

import React, { useCallback, useState } from 'react';
import DecagonLayout from './components/DecagonLayout';
import HeroSelectModal from './components/HeroSelectModal';
import DistributionModal from './components/DistributionModal';
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

  const [progressPhase, setProgressPhase] = useState<'attr' | 'class' | null>(null);
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

  const runAnimationSequence = useCallback(async () => {
    setIsAnimating(true);
    setActiveAttrPos(null);
    setActiveClassPos(null);
    setProgressPhase(null);
    setProgressStep(0);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const maleIndices = [0, 2, 4, 6, 8];
    const femaleIndices = [1, 3, 5, 7, 9];

    // 속성: 남 (0,2,4,6,8) -> 여 (1,3,5,7,9)
    let step = 0;
    setProgressPhase('attr');
    setProgressStep(0);
    for (const idx of maleIndices) {
      setActiveAttrPos(idx);
      setProgressStep(step);
      step += 1;
      await delay(140);
    }
    for (const idx of femaleIndices) {
      setActiveAttrPos(idx);
      setProgressStep(step);
      step += 1;
      await delay(140);
    }
    setActiveAttrPos(null);

    // 클래스: 여 (1,3,5,7,9) -> 남 (0,2,4,6,8)
    step = 0;
    setProgressPhase('class');
    setProgressStep(0);
    for (const idx of femaleIndices) {
      setActiveClassPos(idx);
      setProgressStep(step);
      step += 1;
      await delay(140);
    }
    for (const idx of maleIndices) {
      setActiveClassPos(idx);
      setProgressStep(step);
      step += 1;
      await delay(140);
    }
    setActiveClassPos(null);

    setProgressPhase(null);
    setProgressStep(0);
    setIsAnimating(false);
  }, []);

  const handleExecuteDistribution = async (options: {
    attributeStartGender: string;
    classStartGender: string;
  }) => {
    if (!selectedHero) return;
    try {
      setError(null);
      const currentPool = await ensurePoolForHero(selectedHero);
      setIsDistModalOpen(false);

      const res = await distributeHeroAutoPool(currentPool.id, options);
      setPool(res.pool);
      void runAnimationSequence();
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
      void runAnimationSequence();
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
    <div className="min-h-screen bg-gradient-to-b from-[#050510] via-[#050712] to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">영웅 풀오토</h1>
        <p className="text-sm text-white/60 mb-6">
          한 명의 영웅을 선택하고 10개의 서번트 슬롯에 속성과 클래스를 자동 배분합니다.
        </p>

        <div className="relative rounded-3xl border border-white/10 bg-black/40 px-4 py-6 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
          {/* 상단 상태 표시 */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-white/20 bg-gradient-to-br from-indigo-500/60 to-purple-500/40 flex items-center justify-center text-sm font-semibold">
                {selectedHero ? selectedHero.name[0] : '?'}
              </div>
              <div>
                <div className="text-xs text-white/60">선택된 영웅</div>
                <div className="text-sm font-medium">
                  {selectedHero ? selectedHero.name : '없음'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasServants && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${
                    pool?.isConfirmed
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                      : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40'
                  }`}
                >
                  {pool?.isConfirmed ? '확정 완료' : '배분 완료'}
                </span>
              )}
              {lockScreen && (
                <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium bg-white/10 text-white/80 border border-white/25">
                  연출 중...
                </span>
              )}
            </div>
          </div>

          {/* 10각형 + 중앙 버튼 */}
          <div className="relative flex flex-col items-center gap-6 py-4">
            <DecagonLayout
              servants={pool?.servants ?? null}
              activeAttributePos={activeAttrPos}
              activeClassPos={activeClassPos}
              isConfirmed={!!pool?.isConfirmed}
            />

            {/* 진행 상태 텍스트 */}
            {progressPhase && (
              <div className="mt-4 text-[11px] text-white/70">
                {progressPhase === 'attr'
                  ? `속성 배분 진행 중 (${Math.min(progressStep + 1, 10)} / 10)`
                  : `클래스 배분 진행 중 (${Math.min(progressStep + 1, 10)} / 10)`}
              </div>
            )}

            {/* 중앙 버튼 (절대 위치 겹치지 않도록 아래에 별도 렌더링) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none">
              <button
                type="button"
                onClick={() => setIsHeroModalOpen(true)}
                disabled={lockScreen || !!pool?.isConfirmed}
                className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/40 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_18px_rgba(129,140,248,0.9)] hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {selectedHero ? '영웅 변경' : '영웅 선택'}
              </button>
              {hasServants && !pool?.isConfirmed && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={lockScreen}
                  className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-indigo-400/60 bg-indigo-600/80 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  재생성
                </button>
              )}
              {!hasServants && selectedHero && !pool?.isConfirmed && (
                <button
                  type="button"
                  onClick={handleOpenDistribution}
                  disabled={lockScreen}
                  className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-indigo-400/60 bg-indigo-600/80 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  랜덤생성
                </button>
              )}
            </div>
          </div>

          {/* 하단 버튼들 */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="text-[11px] text-white/40">
              속성은 남 &gt; 여 &gt; 남 &gt; 여 순서로,
              <br className="hidden sm:block" /> 클래스는 여 &gt; 남 &gt; 여 &gt; 남 순서로
              슬롯에 배분됩니다.
            </div>
            <div className="flex items-center gap-2">
              {selectedHero && !pool?.isConfirmed && (
                <button
                  type="button"
                  onClick={handleOpenDistribution}
                  disabled={lockScreen}
                  className="inline-flex items-center justify-center rounded-lg border border-indigo-400/60 bg-indigo-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {hasServants ? '다시 배분' : '랜덤 배분'}
                </button>
              )}
              {hasServants && !pool?.isConfirmed && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={lockScreen}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  확정
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {error}
            </div>
          )}

          {/* 전체 잠금 오버레이 */}
          {lockScreen && (
            <div className="absolute inset-0 z-20 rounded-3xl pointer-events-auto" aria-hidden="true" />
          )}
        </div>
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

