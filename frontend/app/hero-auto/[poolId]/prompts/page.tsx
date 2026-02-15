'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getHeroAutoPool,
  type HeroAutoPool,
  type ServantSlot,
} from '@/app/lib/heroAuto';
import { generateImagePrompt, listFlowCards, getFlowCharacter, uploadFlowCardImage, type FlowCard } from '@/app/lib/flow';
import { getClassIcon, getAttributeColor } from '@/app/hero-auto/components/ServantSlot';
import { IoSparkles, IoCopyOutline, IoImageOutline } from 'react-icons/io5';

/** 성별 입력 정규화: 남 -> 남성, 여 -> 여성 (API/도감은 남성/여성 사용) */
function normalizeGender(g: string | null | undefined): string {
  if (g == null || g === '') return '남성';
  const s = g.trim();
  if (s === '남') return '남성';
  if (s === '여') return '여성';
  return s;
}

export default function HeroAutoPromptsPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const [poolId, setPoolId] = useState<number | null>(null);
  const [pool, setPool] = useState<HeroAutoPool | null>(null);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<{
    position: number;
    prompt: string | null;
    negativePrompt: string | null;
    cardId?: number;
    imageUrl?: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingSlot, setGeneratingSlot] = useState<number | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [uploadingPosition, setUploadingPosition] = useState<number | null>(null);
  const [copiedPosition, setCopiedPosition] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadTargetRef = React.useRef<{ position: number; cardId: number } | null>(null);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const poolRes = await getHeroAutoPool(id);
      setPool(poolRes);
      getFlowCharacter(poolRes.characterId).then((c) => setCharacterName(c.name)).catch(() => setCharacterName(null));
      if (!poolRes.isConfirmed || !poolRes.servants?.length) {
        setPrompts(Array.from({ length: 10 }, (_, i) => ({ position: i, prompt: null, negativePrompt: null })));
        return;
      }
      const cardsRes = await listFlowCards({ characterId: poolRes.characterId });
      const cards: FlowCard[] = cardsRes.cards ?? [];
      const slotPrompts = poolRes.servants.map((slot, position) => {
        const card = cards.find(
          (c) =>
            c.gender === normalizeGender(slot.gender) &&
            c.attribute === (slot.attribute ?? '') &&
            c.type === (slot.type ?? '')
        );
        return {
          position,
          prompt: card?.prompt ?? null,
          negativePrompt: card?.negativePrompt ?? null,
          cardId: card?.id,
          imageUrl: card?.imageUrl ?? null,
        };
      });
      while (slotPrompts.length < 10) {
        slotPrompts.push({
          position: slotPrompts.length,
          prompt: null,
          negativePrompt: null,
          cardId: undefined,
          imageUrl: null,
        });
      }
      setPrompts(slotPrompts);
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
  const allPromptsReady =
    hasServants &&
    prompts.slice(0, 10).every(
      (p) => !!p.prompt?.trim() && !!p.negativePrompt?.trim(),
    );

  // 목록 표시: 클래스 카테고리 순서(classOrder) 기준 정렬, 없으면 한글 가나다 순
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
        : typeA.localeCompare(typeB, 'ko');
    return Array.from({ length: 10 }, (_, i) => i).sort((a, b) => {
      const typeA = servants[a]?.type ?? '';
      const typeB = servants[b]?.type ?? '';
      const byType = compareType(typeA, typeB);
      if (byType !== 0) return byType;
      const attrA = servants[a]?.attribute ?? '';
      const attrB = servants[b]?.attribute ?? '';
      const byAttr = attrA.localeCompare(attrB, 'ko');
      if (byAttr !== 0) return byAttr;
      return a - b;
    });
  }, [hasServants, servants, pool?.classOrder]);

  const handleCopyPrompt = useCallback((position: number) => {
    const p = prompts[position];
    if (!p?.prompt?.trim() || !p?.negativePrompt?.trim()) return;
    const text = `프롬프트:\n${p.prompt}\n\n네거티브:\n${p.negativePrompt}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPosition(position);
      setTimeout(() => setCopiedPosition(null), 1500);
    });
  }, [prompts]);

  const handleUploadClick = useCallback((position: number) => {
    const cardId = prompts[position]?.cardId;
    if (cardId == null) return;
    uploadTargetRef.current = { position, cardId };
    setUploadingPosition(position);
    fileInputRef.current?.click();
  }, [prompts]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const target = uploadTargetRef.current;
      const file = e.target.files?.[0];
      e.target.value = '';
      uploadTargetRef.current = null;
      setUploadingPosition(null);
      if (target == null || !file || poolId == null) return;
      setError(null);
      try {
        await uploadFlowCardImage(target.cardId, file);
        await load(poolId);
      } catch (err) {
        setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.');
      }
    },
    [poolId, load],
  );

  const handleGenerateOne = async (position: number) => {
    if (!pool?.characterId || !hasServants) return;
    const slot = servants[position];
    if (!slot?.attribute || !slot?.type) return;
    setGeneratingSlot(position);
    setError(null);
    try {
      const res = await generateImagePrompt({
        characterId: pool.characterId,
        gender: normalizeGender(slot.gender),
        attribute: slot.attribute,
        type: slot.type,
      });
      setPrompts((prev) => {
        const next = [...prev];
        const existing = next[position];
        next[position] = {
          ...existing,
          position,
          prompt: res.prompt,
          negativePrompt: res.negativePrompt,
        };
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '프롬프트 생성 실패');
    } finally {
      setGeneratingSlot(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!pool?.characterId || !hasServants) return;
    setGeneratingAll(true);
    setError(null);
    try {
      // 이미 프롬프트가 있는 슬롯은 제외하고, 없는 것만 생성
      const tasks = servants.slice(0, 10).map((slot, position) => {
        if (!slot?.attribute || !slot?.type) return null;
        const existing = prompts[position];
        if (existing?.prompt) return null; // 이미 만들어진 건 스킵
        return { position, slot };
      }).filter((t): t is { position: number; slot: ServantSlot } => t !== null);

      if (tasks.length === 0) {
        setGeneratingAll(false);
        return;
      }

      const results = await Promise.all(
        tasks.map(({ position, slot }) =>
          generateImagePrompt({
            characterId: pool.characterId,
            gender: normalizeGender(slot.gender),
            attribute: slot.attribute ?? '',
            type: slot.type ?? '',
          }).then((res) => ({ position, prompt: res.prompt, negativePrompt: res.negativePrompt }))
        )
      );

      setPrompts((prev) => {
        const next = [...prev];
        for (const { position, prompt, negativePrompt } of results) {
          const existing = next[position];
          next[position] = { ...existing, position, prompt, negativePrompt };
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '전체 프롬프트 생성 실패');
    } finally {
      setGeneratingAll(false);
    }
  };

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
        <Link
          href="/hero-auto"
          className="text-indigo-300 hover:text-indigo-200 underline"
        >
          풀오토로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050510] via-[#050712] to-black text-white flex flex-col">
      <header className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/hero-auto"
            className="text-white/70 hover:text-white text-sm"
          >
            ← 풀오토
          </Link>
          <h1 className="text-lg font-semibold text-white">
            프롬프트 관리 · 풀 #{poolId}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {allPromptsReady && (
            <Link
              href={`/hero-auto/${poolId}/prompts/gallery`}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 border border-white/20"
            >
              이미지 카드 보기 (5×2)
            </Link>
          )}
          {!allPromptsReady && (
            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={generatingAll || !hasServants}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingAll ? '생성 중...' : '한번에 모든 프롬프트 생성'}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="flex-shrink-0 mx-4 mt-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
        {/* 왼쪽: 10건 테이블 */}
        <div className="flex-shrink-0 w-[280px] flex flex-col rounded-lg border border-white/20 bg-white/5 overflow-hidden">
          <div className="flex-shrink-0 px-3 py-2 border-b border-white/10 text-xs font-medium text-white/80">
            10건 경우의 수
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-black/40 text-white/70">
                <tr>
                  <th className="px-2 py-1.5 font-medium w-8">#</th>
                  <th className="px-2 py-1.5 font-medium">성별</th>
                  <th className="px-2 py-1.5 font-medium">속성</th>
                  <th className="px-2 py-1.5 font-medium">클래스</th>
                  <th className="px-2 py-1.5 font-medium w-10" />
                </tr>
              </thead>
              <tbody>
                {sortedIndices.map((position, i) => {
                  const s = hasServants ? servants[position] : { position, gender: '-', attribute: '-', type: '-' };
                  const attrColor = getAttributeColor(s?.attribute);
                  return (
                    <tr key={position} className="border-t border-white/10">
                      <td className="px-2 py-1.5 tabular-nums text-white/90">{i + 1}</td>
                      <td className="px-2 py-1.5 text-white/90">{s?.gender ?? '-'}</td>
                      <td className="px-2 py-1.5 text-white/90">{s?.attribute ?? '-'}</td>
                      <td className="px-2 py-1.5 text-white/90">{s?.type ?? '-'}</td>
                      <td className="px-2 py-1.5">
                        <span className="flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 [&>div]:w-4 [&>div]:h-4">
                          {getClassIcon(s?.type, attrColor)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 오른쪽: 맨 왼쪽 번호+아이콘, 명칭, 프롬프트/네거티브 한줄, 액션(생성/복사/업로드) */}
        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-white/20 bg-white/5 overflow-hidden">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            aria-hidden
          />
          <div className="flex-shrink-0 grid gap-2 px-2 py-1.5 border-b border-white/10 text-[10px] font-medium text-white/80 grid-cols-[auto_1fr_1fr_1fr_auto]">
            <span className="w-14" />
            <span>명칭</span>
            <span>프롬프트</span>
            <span>네거티브 프롬프트</span>
            <span className="w-20" />
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1.5">
            {sortedIndices.map((position, i) => {
              const slotPrompt = prompts[position] ?? {
                position,
                prompt: null,
                negativePrompt: null,
              };
              const hasPrompt = !!slotPrompt.prompt?.trim();
              const hasNegative = !!slotPrompt.negativePrompt?.trim();
              const isGenerating = generatingSlot === position || generatingAll;
              const slot = servants[position];
              const attrColor = getAttributeColor(slot?.attribute);
              const heroLabel = characterName ?? '영웅';
              const genderLabel = normalizeGender(slot?.gender);
              const slotLabel =
                slot?.attribute && slot?.type
                  ? `${heroLabel}(${genderLabel}) : ${slot.attribute}의 ${slot.type}`
                  : '-';
              const showGenerate =
                (!hasPrompt || !hasNegative) && slot?.attribute && slot?.type;

              const hasBoth = hasPrompt && hasNegative;
              const hasImage = !!slotPrompt.imageUrl?.trim();
              const canUpload = hasBoth && !hasImage && slotPrompt.cardId != null;
              const isUploading = uploadingPosition === position;

              return (
                <div
                  key={position}
                  className="rounded border border-white/15 bg-black/30 px-2 py-1.5 grid gap-2 grid-cols-[auto_1fr_1fr_1fr_auto] items-center min-h-0"
                >
                  <div className="flex items-center gap-1 w-14 flex-shrink-0">
                    <span className="text-[10px] text-white/60 tabular-nums w-3">
                      {i + 1}
                    </span>
                    <div className="flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 [&>div]:w-4 [&>div]:h-4">
                      {getClassIcon(slot?.type, attrColor)}
                    </div>
                  </div>
                  <Link
                    href={
                      slot?.attribute && slot?.type
                        ? `/encyclopedia?characterId=${pool?.characterId ?? ''}&gender=${encodeURIComponent(normalizeGender(slot.gender))}&attribute=${encodeURIComponent(slot.attribute)}&type=${encodeURIComponent(slot.type)}`
                        : '#'
                    }
                    className="text-[11px] font-medium text-white/90 truncate min-w-0 text-left hover:text-indigo-200 hover:underline focus:outline-none focus:underline disabled:pointer-events-none disabled:opacity-50"
                    onClick={(e) => !slot?.attribute || !slot?.type ? e.preventDefault() : undefined}
                  >
                    {slotLabel}
                  </Link>
                  <div className="min-w-0 text-[11px] text-white/80 truncate bg-black/20 rounded px-1.5 py-0.5">
                    {hasPrompt ? slotPrompt.prompt : <span className="text-white/40 italic">없음</span>}
                  </div>
                  <div className="min-w-0 text-[11px] text-white/80 truncate bg-black/20 rounded px-1.5 py-0.5">
                    {hasNegative ? slotPrompt.negativePrompt : <span className="text-white/40 italic">없음</span>}
                  </div>
                  <div className="w-20 flex-shrink-0 flex items-center justify-end gap-0.5">
                    {showGenerate ? (
                      <button
                        type="button"
                        onClick={() => handleGenerateOne(position)}
                        disabled={isGenerating}
                        className="p-0.5 rounded text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="프롬프트 생성"
                        aria-label="프롬프트 생성"
                      >
                        <IoSparkles className="w-4 h-4" />
                      </button>
                    ) : null}
                    {hasBoth && (
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(position)}
                        className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10"
                        title="프롬프트·네거티브 클립보드 복사"
                        aria-label="클립보드 복사"
                      >
                        {copiedPosition === position ? (
                          <span className="text-[10px] text-emerald-400">복사됨</span>
                        ) : (
                          <IoCopyOutline className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {canUpload && (
                      <button
                        type="button"
                        onClick={() => handleUploadClick(position)}
                        disabled={isUploading}
                        className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50"
                        title="이미지 업로드"
                        aria-label="이미지 업로드"
                      >
                        {isUploading ? (
                          <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <IoImageOutline className="w-4 h-4" />
                        )}
                      </button>
                    )}
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
