'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getHeroAutoPool, type HeroAutoPool, type ServantSlot } from '@/app/lib/heroAuto';
import { listFlowCards, getFlowCharacter, type FlowCard } from '@/app/lib/flow';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

function normalizeGender(g: string | null | undefined): string {
  if (g == null || g === '') return '남성';
  const s = g.trim();
  if (s === '남') return '남성';
  if (s === '여') return '여성';
  return s;
}

export default function HeroAutoGalleryPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const [poolId, setPoolId] = useState<number | null>(null);
  const [pool, setPool] = useState<HeroAutoPool | null>(null);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [slots, setSlots] = useState<{
    position: number;
    imageUrl?: string | null;
    attribute?: string | null;
    type?: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const poolRes = await getHeroAutoPool(id);
      setPool(poolRes);
      getFlowCharacter(poolRes.characterId).then((c) => setCharacterName(c.name)).catch(() => setCharacterName(null));
      if (!poolRes.isConfirmed || !poolRes.servants?.length) {
        setSlots(Array.from({ length: 10 }, (_, i) => ({ position: i })));
        return;
      }
      const cardsRes = await listFlowCards({ characterId: poolRes.characterId });
      const cards: FlowCard[] = cardsRes.cards ?? [];
      const slotData = poolRes.servants.map((slot, position) => {
        const card = cards.find(
          (c) =>
            c.gender === normalizeGender(slot.gender) &&
            c.attribute === (slot.attribute ?? '') &&
            c.type === (slot.type ?? '')
        );
        return {
          position,
          imageUrl: card?.imageUrl ?? null,
          attribute: slot.attribute ?? null,
          type: slot.type ?? null,
        };
      });
      while (slotData.length < 10) {
        slotData.push({ position: slotData.length });
      }
      setSlots(slotData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    params.then((p) => {
      const id = parseInt(p.poolId, 10);
      if (!Number.isNaN(id) && mounted) {
        setPoolId(id);
        load(id);
      }
    });
    return () => {
      mounted = false;
    };
  }, [params, load]);

  const servants: ServantSlot[] = pool?.servants ?? [];
  const hasServants = servants.length >= 10;

  const sortedIndices = React.useMemo(() => {
    if (!hasServants) return Array.from({ length: 10 }, (_, i) => i);
    const classOrder = pool?.classOrder ?? [];
    const orderOf = (typeName: string) => {
      if (classOrder.length === 0) return 0;
      const i = classOrder.indexOf(typeName);
      return i >= 0 ? i : 9999;
    };
    const compareType = (typeA: string, typeB: string) =>
      classOrder.length > 0
        ? orderOf(typeA) - orderOf(typeB)
        : (typeA || '').localeCompare(typeB || '', 'ko');
    return Array.from({ length: 10 }, (_, i) => i).sort((a, b) => {
      const typeA = servants[a]?.type ?? '';
      const typeB = servants[b]?.type ?? '';
      const byType = compareType(typeA, typeB);
      if (byType !== 0) return byType;
      const attrA = servants[a]?.attribute ?? '';
      const attrB = servants[b]?.attribute ?? '';
      return attrA.localeCompare(attrB, 'ko') || a - b;
    });
  }, [hasServants, servants, pool?.classOrder]);

  if (loading || poolId == null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#050510] via-[#050712] to-black text-white flex items-center justify-center">
        <span className="text-white/70">불러오는 중...</span>
      </div>
    );
  }

  if (error && !pool) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#050510] via-[#050712] to-black text-white flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-300">{error}</p>
        <Link href="/hero-auto" className="text-indigo-300 hover:text-indigo-200 underline">
          풀오토로 돌아가기
        </Link>
      </div>
    );
  }

  const imageUrlFor = (position: number) => {
    const url = slots[position]?.imageUrl;
    if (!url?.trim()) return null;
    return url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050510] via-[#050712] to-black text-white flex flex-col">
      <header className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href={`/hero-auto/${poolId}/prompts`}
            className="text-white/70 hover:text-white text-sm"
          >
            ← 프롬프트 관리
          </Link>
          <h1 className="text-lg font-semibold text-white">
            이미지 카드 · {characterName ?? '영웅'} · 풀 #{poolId}
          </h1>
        </div>
      </header>

      {error && (
        <div className="flex-shrink-0 mx-4 mt-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 p-3 flex flex-col">
        <div className="w-full flex-1 min-h-0">
          <div className="grid grid-cols-5 grid-rows-[1fr_1fr] gap-3 w-full h-full">
            {sortedIndices.map((position, i) => {
              const slot = slots[position];
              const url = imageUrlFor(position);
              const label =
                slot?.attribute && slot?.type
                  ? `${slot.attribute}의 ${slot.type}`
                  : `#${i + 1}`;
              return (
                <div
                  key={position}
                  className="rounded-lg border border-white/20 bg-white/5 overflow-hidden flex flex-col min-w-0 min-h-0 h-full"
                >
                  <div className="flex-1 min-h-0 flex items-center justify-center bg-black/30 relative overflow-hidden">
                    {url ? (
                      <img
                        src={url}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white/40 text-xs">이미지 없음</span>
                    )}
                  </div>
                  <div className="flex-shrink-0 px-2 py-1.5 border-t border-white/10 text-[10px] text-white/80 truncate text-center">
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
