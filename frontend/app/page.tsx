'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:8000';

const INITIAL_COUNT = 36;
const LOAD_MORE_COUNT = 24;
const POOL_BATCH_SIZE = 200;
const SCROLL_THRESHOLD = 400;

interface CardItem {
  cardSn: number;
  cardName: string;
  generatedImageUrl: string | null;
  draftImageUrl?: string | null;
}

type DisplayItem = CardItem & { uniqueKey: number; isPlaceholder?: boolean; gradient?: string };

const PLACEHOLDER_GRADIENTS = [
  'from-amber-400 via-orange-500 to-rose-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-violet-400 via-purple-500 to-fuchsia-600',
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-rose-400 via-pink-500 to-red-500',
  'from-lime-400 via-green-500 to-emerald-600',
  'from-amber-300 via-yellow-400 to-orange-500',
  'from-slate-400 via-gray-500 to-zinc-600',
];

const PLACEHOLDER_ITEMS: DisplayItem[] = Array.from({ length: 24 }, (_, i) => ({
  cardSn: i,
  cardName: '',
  generatedImageUrl: null,
  draftImageUrl: null,
  uniqueKey: i,
  isPlaceholder: true,
  gradient: PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length],
}));

function imageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function randomRepeat<T extends { cardSn: number }>(
  source: T[],
  count: number,
  seedOffset: number = 0
): (T & { uniqueKey: number })[] {
  if (source.length === 0) return [];
  const result: (T & { uniqueKey: number })[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((Math.sin((seedOffset + i) * 9999) * 0.5 + 0.5) * source.length) % source.length;
    result.push({ ...source[idx], uniqueKey: seedOffset + i });
  }
  return result;
}

export default function Home() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<DisplayItem[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT);
  const loadingMore = useRef(false);
  const initialPoolSet = useRef(false);

  const sourceItems: DisplayItem[] =
    cards.length > 0
      ? cards.map((c, i) => ({ ...c, uniqueKey: i, cardSn: c.cardSn }))
      : PLACEHOLDER_ITEMS;

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/v1/cards/list?limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.cards) return;
        setCards(
          data.cards.map((c: { cardSn: number; cardName: string; generatedImageUrl?: string; draftImageUrl?: string }) => ({
            cardSn: c.cardSn,
            cardName: c.cardName,
            generatedImageUrl: c.generatedImageUrl ?? null,
            draftImageUrl: c.draftImageUrl ?? null,
          }))
        );
      })
      .catch(() => setCards([]))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 최초 1회만 풀 세팅 (위쪽 데이터 유지). 이후에는 스크롤 시 아래로만 추가
  useEffect(() => {
    if (cards.length === 0) {
      initialPoolSet.current = false;
      setPool(randomRepeat(PLACEHOLDER_ITEMS, POOL_BATCH_SIZE, 0));
      setDisplayCount(INITIAL_COUNT);
      return;
    }
    if (initialPoolSet.current) return;
    initialPoolSet.current = true;
    const source = cards.map((c, i) => ({ ...c, uniqueKey: i, cardSn: c.cardSn }));
    setPool(randomRepeat(source, POOL_BATCH_SIZE, 0));
    setDisplayCount(INITIAL_COUNT);
  }, [cards]);

  const getSourceForPool = useCallback((): DisplayItem[] => {
    return cards.length > 0
      ? cards.map((c, i) => ({ ...c, uniqueKey: i, cardSn: c.cardSn }))
      : PLACEHOLDER_ITEMS;
  }, [cards]);

  const loadMore = useCallback(() => {
    if (loadingMore.current || sourceItems.length === 0) return;
    loadingMore.current = true;
    setDisplayCount((prev) => {
      const next = prev + LOAD_MORE_COUNT;
      loadingMore.current = false;
      return next;
    });
  }, [sourceItems.length]);

  // 스크롤로 더 필요할 때만 아래쪽에 풀 추가 (위쪽 pool은 변경하지 않음)
  useEffect(() => {
    if (pool.length === 0 || displayCount <= pool.length - LOAD_MORE_COUNT) return;
    const source = getSourceForPool();
    if (source.length === 0) return;
    setPool((prev) => [...prev, ...randomRepeat(source, POOL_BATCH_SIZE, prev.length)]);
  }, [displayCount, pool.length, getSourceForPool]);

  useEffect(() => {
    const container = document.documentElement;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
        loadMore();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  const displayItems = pool.slice(0, displayCount);

  return (
    <div className="min-h-screen bg-[#0c0c0f]">
      <Link
        href="/create"
        className="fixed top-4 right-4 z-30 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="create"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      <main className="pinterest-masonry pt-4 pb-8 px-3 sm:px-4 md:px-6">
        {loading ? (
          <div className="pinterest-masonry-inner">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="pinterest-pin rounded-2xl bg-white/10 animate-pulse aspect-[2/3]" />
            ))}
          </div>
        ) : (
          <div className="pinterest-masonry-inner">
            {displayItems.map((item: DisplayItem, i) => {
              const src = item.generatedImageUrl || item.draftImageUrl;
              const isPlaceholder = item.isPlaceholder;

              return (
                <div key={item.uniqueKey} className="pinterest-pin">
                  {isPlaceholder || !src ? (
                    <div
                      className={`w-full aspect-[2/3] rounded-2xl bg-gradient-to-br ${
                        item.gradient ??
                        PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]
                      }`}
                    />
                  ) : (
                    <img
                      src={imageUrl(src)}
                      alt=""
                      className="w-full aspect-[2/3] object-cover rounded-2xl"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
