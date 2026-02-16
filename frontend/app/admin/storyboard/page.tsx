'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE, getStoredToken } from '@/app/lib/auth';
import { FiSave, FiTrash2, FiPlus } from 'react-icons/fi';
import ConfirmModal from '@/app/components/ConfirmModal';

interface Card {
  cardSn: number;
  cardName: string;
  cardNumber?: string;
  type: string;
  attribute: string;
  rarity: string;
  generatedImageUrl?: string;
  characterImageUrl?: string;
  backgroundImageUrl?: string;
  draftImageUrl?: string;
}

interface CardListResponse {
  success: boolean;
  total: number;
  cards: Card[];
}

interface StoryboardScene {
  id: number;
  sortOrder: number;
  content: string;
  durationSeconds: number;
}

interface Storyboard {
  id: number;
  cardSn: number;
  scenes: StoryboardScene[];
}

/** 로컬 편집용 씬 (id 없을 수 있음) */
interface SceneEdit {
  id?: number;
  sortOrder: number;
  content: string;
  durationSeconds: number;
}

function getImageUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  let path = url.trim();
  if (path.startsWith('/data/upload/') || path.startsWith('/data/upload')) {
    path = path.replace(/\/+/g, '/');
    return `${API_BASE}${path}`;
  }
  if (path.startsWith('/upload/') || path.startsWith('/upload')) {
    path = `/data${path}`.replace(/\/+/g, '/');
    return `${API_BASE}${path}`;
  }
  if (!path.startsWith('/')) path = `/${path}`;
  path = `/data/upload${path}`.replace(/\/+/g, '/');
  return `${API_BASE}${path}`;
}

export default function AdminStoryboardPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [loadingStoryboard, setLoadingStoryboard] = useState(false);
  const [scenes, setScenes] = useState<SceneEdit[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteSceneId, setDeleteSceneId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = getStoredToken();
  const headers: HeadersInit = token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };

  const fetchCards = useCallback(async () => {
    try {
      setLoadingCards(true);
      const res = await fetch(`${API_BASE}/api/v1/cards/list?limit=500`);
      if (!res.ok) throw new Error('카드 목록을 불러오지 못했습니다.');
      const data: CardListResponse = await res.json();
      setCards(data.cards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoadingCards(false);
    }
  }, []);

  const fetchStoryboard = useCallback(
    async (cardSn: number) => {
      if (!token) return;
      try {
        setLoadingStoryboard(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/v1/storyboards/by-card/${cardSn}`, { headers });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || '스토리보드를 불러오지 못했습니다.');
        }
        const data: Storyboard = await res.json();
        setStoryboard(data);
        setScenes(
          data.scenes.map((s) => ({
            id: s.id,
            sortOrder: s.sortOrder,
            content: s.content,
            durationSeconds: s.durationSeconds,
          })),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : '스토리보드 로드 실패');
        setStoryboard(null);
        setScenes([]);
      } finally {
        setLoadingStoryboard(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    if (!selectedCard) {
      setStoryboard(null);
      setScenes([]);
      return;
    }
    fetchStoryboard(selectedCard.cardSn);
  }, [selectedCard, fetchStoryboard]);

  const handleSave = async () => {
    if (!storyboard || !token) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/v1/storyboards/${storyboard.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          scenes: scenes.map((s, i) => ({
            sortOrder: i + 1,
            content: s.content,
            durationSeconds: Math.max(0, s.durationSeconds),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '저장에 실패했습니다.');
      }
      const data: Storyboard = await res.json();
      setStoryboard(data);
      setScenes(
        data.scenes.map((s) => ({
          id: s.id,
          sortOrder: s.sortOrder,
          content: s.content,
          durationSeconds: s.durationSeconds,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleAddScene = () => {
    setScenes((prev) => [
      ...prev,
      { sortOrder: prev.length + 1, content: '', durationSeconds: 0 },
    ]);
  };

  const handleUpdateScene = (index: number, field: 'content' | 'durationSeconds', value: string | number) => {
    setScenes((prev) => {
      const next = [...prev];
      const s = next[index];
      if (!s) return prev;
      if (field === 'content') next[index] = { ...s, content: value as string };
      else next[index] = { ...s, durationSeconds: typeof value === 'number' ? value : parseInt(String(value), 10) || 0 };
      return next;
    });
  };

  const handleDeleteScene = (sceneId: number) => {
    setDeleteSceneId(sceneId);
  };

  const confirmDeleteScene = async () => {
    if (deleteSceneId == null || !token) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/api/v1/storyboards/scenes/${deleteSceneId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      setScenes((prev) => prev.filter((s) => s.id !== deleteSceneId));
      setStoryboard((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.filter((s) => s.id !== deleteSceneId),
            }
          : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setDeleting(false);
      setDeleteSceneId(null);
    }
  };

  const removeLocalScene = (index: number) => {
    setScenes((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">스토리보드</h1>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 카드 선택 (게시물 관리와 동일한 리스트 형태) */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">카드 선택</h2>
          {loadingCards ? (
            <div className="flex items-center justify-center py-8 text-gray-500">로딩 중...</div>
          ) : cards.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">카드가 없습니다.</p>
          ) : (
            <ul className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-[420px] overflow-y-auto">
              {cards.map((card) => {
                const imgUrl = getImageUrl(
                  card.generatedImageUrl || card.characterImageUrl || card.draftImageUrl || card.backgroundImageUrl,
                );
                const isSelected = selectedCard?.cardSn === card.cardSn;
                return (
                  <li key={card.cardSn}>
                    <button
                      type="button"
                      onClick={() => setSelectedCard(card)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-600'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center text-gray-400 text-xl"
                        style={{ aspectRatio: '1' }}
                      >
                        {imgUrl ? (
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>🎴</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{card.cardName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          #{card.cardSn} · {card.type} · {card.attribute}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 오른쪽: 스토리보드 (씬1, 씬2, ...) */}
        <div className="lg:col-span-2 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden min-h-0">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
              {selectedCard ? `스토리보드 · ${selectedCard.cardName}` : '카드를 선택하세요'}
            </span>
            {selectedCard && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddScene}
                  className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <FiPlus className="h-4 w-4" />
                  씬 추가
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <FiSave className="h-4 w-4" />
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedCard ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">왼쪽에서 카드를 선택하세요.</p>
            ) : loadingStoryboard ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {scenes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">씬이 없습니다. &quot;씬 추가&quot;로 씬1부터 추가하세요.</p>
                ) : (
                  scenes.map((scene, index) => (
                    <div
                      key={scene.id ?? `new-${index}`}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          씬{index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            진행시간(초)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={scene.durationSeconds}
                            onChange={(e) =>
                              handleUpdateScene(index, 'durationSeconds', e.target.value)
                            }
                            className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              scene.id != null ? handleDeleteScene(scene.id) : removeLocalScene(index)
                            }
                            className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="삭제"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={scene.content}
                        onChange={(e) => handleUpdateScene(index, 'content', e.target.value)}
                        placeholder="씬 내용을 입력하세요"
                        rows={3}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-y"
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteSceneId != null}
        onClose={() => setDeleteSceneId(null)}
        onConfirm={confirmDeleteScene}
        title="씬 삭제"
        message="이 씬을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
      {deleting && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-xl">
            삭제 중...
          </div>
        </div>
      )}
    </div>
  );
}
