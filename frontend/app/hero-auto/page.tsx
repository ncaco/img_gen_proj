'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import DecagonLayout from './components/DecagonLayout';
import HeroSelectModal from './components/HeroSelectModal';
import DistributionModal, { type RouletteDirection } from './components/DistributionModal';
import type { FlowCharacter } from '@/app/lib/flow';
import {
  createHeroAutoPool,
  distributeHeroAutoPool,
  confirmHeroAutoPool,
  regenerateHeroAutoPool,
  listHeroAutoPools,
  deleteHeroAutoPool,
  type HeroAutoPool,
  type HeroAutoPoolListItem,
} from '@/app/lib/heroAuto';

export default function HeroAutoPage() {
  const router = useRouter();
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [poolList, setPoolList] = useState<HeroAutoPoolListItem[]>([]);
  const [poolListLoading, setPoolListLoading] = useState(false);

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
      const stepDelayMs = 100; // 회전당 한 칸 대기 (작을수록 빠름, 기존 500)

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
        await delay(stepDelayMs);
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
        await delay(stepDelayMs);
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
        await delay(stepDelayMs);
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
      router.push(`/hero-auto/${res.pool.id}/prompts`);
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
        attributeStartGender: '남성',
        classStartGender: '여성',
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

  useEffect(() => {
    if (!sidebarOpen) return;
    setPoolListLoading(true);
    listHeroAutoPools()
      .then(setPoolList)
      .catch(() => setPoolList([]))
      .finally(() => setPoolListLoading(false));
  }, [sidebarOpen]);

  const handleSelectPool = useCallback(
    (item: HeroAutoPoolListItem) => {
      router.push(`/hero-auto/${item.id}/prompts`);
    },
    [router],
  );

  const handleDeletePool = useCallback(
    async (e: React.MouseEvent, item: HeroAutoPoolListItem) => {
      e.stopPropagation();
      if (!window.confirm(`"${item.characterName ?? `풀 #${item.id}`}" 풀을 삭제할까요?`)) return;
      try {
        await deleteHeroAutoPool(item.id);
        const next = await listHeroAutoPools();
        setPoolList(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : '풀 삭제에 실패했습니다.');
      }
    },
    [],
  );

  return (
    <div className="min-h-screen w-full overflow-hidden flex flex-col bg-gradient-to-b from-[#050510] via-[#050712] to-black text-white pt-14">
      {/* 사이드바: 풀 목록 (열기/닫기) - 헤더 아래부터 */}
      <div
        className={`fixed left-0 top-14 z-10 flex h-[calc(100vh-3.5rem)] flex-col border-r border-white/20 bg-black/90 backdrop-blur-sm transition-[width] duration-200 ${
          sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 px-2 py-2">
          <span className="text-xs font-medium text-white/80 truncate">
            풀 목록
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="사이드바 닫기"
          >
            <IoChevronBack className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {poolListLoading ? (
            <div className="px-3 py-4 text-center text-[10px] text-white/50">
              불러오는 중...
            </div>
          ) : poolList.length === 0 ? (
            <div className="px-3 py-4 text-center text-[10px] text-white/50">
              생성된 풀이 없습니다.
            </div>
          ) : (
            <ul className="py-1">
              {poolList.map((item) => (
                <li key={item.id} className="group flex items-stretch">
                  <button
                    type="button"
                    onClick={() => handleSelectPool(item)}
                    className={`flex-1 min-w-0 px-3 py-2 text-left text-xs transition-colors flex flex-col gap-0.5 ${
                      pool?.id === item.id
                        ? 'bg-indigo-500/30 text-white'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-medium truncate">
                      {item.characterName ?? `캐릭터 #${item.characterId}`}
                    </span>
                    <span className="text-[10px] text-white/60">
                      풀 #{item.id}
                      {item.isConfirmed ? ' · 확정' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeletePool(e, item)}
                    className="flex-shrink-0 px-2 py-1.5 text-white/50 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    title="풀 삭제"
                    aria-label="풀 삭제"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 사이드바 열기 버튼 (사이드바가 닫혀 있을 때만) - 헤더 아래 중앙 */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-10 rounded-r border border-white/20 border-l-0 bg-black/80 px-1.5 py-3 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="풀 목록 열기"
        >
          <IoChevronForward className="w-4 h-4" />
        </button>
      )}

      <div
        className={`relative flex-1 flex flex-col min-h-0 px-3 sm:px-4 py-3 origin-top transition-[width,margin] duration-200 ${
          sidebarOpen ? 'ml-56 w-[calc(100%-14rem)] max-w-[calc(1920px-14rem)]' : 'ml-0 w-full max-w-[1920px]'
        } mx-auto`}
        style={{ transform: 'scale(0.88)', minHeight: 'calc(100vh - 3.5rem)' }}
      >
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

        {/* 10각형 영역: 화면 안에 스크롤 없이 맞춤, 가운데 정렬 (스케일로 전체 수납) */}
        <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center py-1 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center min-w-0 min-h-0 max-w-[82vmin] max-h-[82vmin]">
            <DecagonLayout
              servants={pool?.servants ?? null}
              activeAttributePos={activeAttrPos}
              activeClassPos={activeClassPos}
              activePhase={progressPhase}
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
              <>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={lockScreen}
                  className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-indigo-400/60 bg-indigo-600/80 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-indigo-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  재생성
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={lockScreen}
                  className="pointer-events-auto inline-flex items-center justify-center rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  확정
                </button>
              </>
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

