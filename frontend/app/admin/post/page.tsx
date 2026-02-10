'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE, getStoredToken } from '@/app/lib/auth';
import { FiSave, FiTrash2, FiEdit2, FiImage, FiZap, FiCopy } from 'react-icons/fi';

const INSTAGRAM_CAPTION_MAX = 2200;
const INSTAGRAM_FEED_ASPECT = { w: 4, h: 5 }; // 4:5 권장

interface Card {
  cardSn: number;
  cardNumber?: string;
  cardName: string;
  type: string;
  attribute: string;
  rarity: string;
  gender?: string;
  generatedImageUrl?: string;
  characterImageUrl?: string;
  draftImageUrl?: string;
}

interface CardListResponse {
  success: boolean;
  total: number;
  cards: Card[];
}

interface SnsPost {
  id: number;
  cardSn: number;
  flowCardId?: number;
  content: string;
  platform?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SnsPostListResponse {
  success: boolean;
  total: number;
  posts: SnsPost[];
}

function getImageUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  const normalized = path.replace(/^\/upload/, '/data/upload').replace(/\/+/g, '/');
  return `${API_BASE}${normalized}`;
}

export default function AdminPostPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [posts, setPosts] = useState<SnsPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formContent, setFormContent] = useState('');
  const [formPlatform, setFormPlatform] = useState('');
  const [formStatus, setFormStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPlatform, setEditPlatform] = useState('');
  const [editStatus, setEditStatus] = useState('draft');

  // 인스타그램 업로드용 템플릿
  const [instagramFirstLine, setInstagramFirstLine] = useState('');
  const [instagramBody, setInstagramBody] = useState('');
  const [instagramBodyNarrative, setInstagramBodyNarrative] = useState('');
  const [instagramBodySpec, setInstagramBodySpec] = useState('');
  const [instagramBodyQuestion, setInstagramBodyQuestion] = useState('');
  const [instagramHashtags, setInstagramHashtags] = useState('');
  const instagramCaption = [
    instagramFirstLine.trim(),
    instagramBody.trim(),
    instagramHashtags
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .join(' '),
  ]
    .filter(Boolean)
    .join('\n\n');
  const instagramCaptionLength = instagramCaption.length;
  const [previewFit, setPreviewFit] = useState<'contain' | 'cover'>('contain');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [generatingField, setGeneratingField] = useState<'firstLine' | 'body' | 'hashtags' | null>(null);
  const [copiedField, setCopiedField] = useState<'firstLine' | 'body' | 'hashtags' | null>(null);

  const copyToClipboard = async (text: string, field: 'firstLine' | 'body' | 'hashtags') => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      setError('클립보드 복사에 실패했습니다.');
    }
  };

  const token = getStoredToken();
  const headers = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };

  const fetchCards = useCallback(async () => {
    try {
      setLoadingCards(true);
      const res = await fetch(`${API_BASE}/api/v1/cards/list?limit=500`);
      if (!res.ok) throw new Error('카드 목록을 불러오지 못했습니다.');
      const data: CardListResponse = await res.json();
      setCards(data.cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoadingCards(false);
    }
  }, []);

  const fetchPosts = useCallback(async (cardSn: number) => {
    if (!token) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/card-sns-posts?card_sn=${cardSn}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('게시물 목록을 불러오지 못했습니다.');
      const data: SnsPostListResponse = await res.json();
      setPosts(data.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    if (selectedCard) {
      fetchPosts(selectedCard.cardSn);
    } else {
      setPosts([]);
    }
  }, [selectedCard, fetchPosts]);

  const handleSelectCard = (card: Card) => {
    setSelectedCard(card);
    setFormContent('');
    setFormPlatform('');
    setFormStatus('draft');
    setEditingId(null);
    setInstagramFirstLine('');
    setInstagramBody('');
    setInstagramBodyNarrative('');
    setInstagramBodySpec('');
    setInstagramBodyQuestion('');
    setInstagramHashtags('');
  };

  const applyInstagramTemplateToCaption = () => {
    setFormContent(instagramCaption);
    setFormPlatform('instagram');
  };

  const handleGenerateInstagramCaption = async () => {
    if (!selectedCard || !token) return;
    setGeneratingCaption(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/card-sns-posts/generate-instagram-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ card_sn: selectedCard.cardSn }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'AI 생성에 실패했습니다.');
      }
      const data = await res.json();
      const bodyNarrative: string = data.bodyNarrative ?? '';
      const bodySpec: string = data.bodySpec ?? '';
      const bodyQuestion: string = data.bodyQuestion ?? '';

      setInstagramFirstLine(data.firstLine ?? '');
      setInstagramBodyNarrative(bodyNarrative);
      setInstagramBodySpec(bodySpec);
      setInstagramBodyQuestion(bodyQuestion);
      // 세 파츠를 줄바꿈으로 합쳐서 본문 textarea에 반영 (각 파트 한 줄씩)
      setInstagramBody(
        [bodyNarrative, bodySpec, bodyQuestion]
          .filter((part) => part && part.trim().length > 0)
          .join('\n\n')
      );
      setInstagramHashtags(data.hashtags ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleGenerateInstagramCaptionSingle = async (field: 'firstLine' | 'body' | 'hashtags') => {
    if (!selectedCard || !token) return;
    setGeneratingField(field);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/card-sns-posts/generate-instagram-caption-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ card_sn: selectedCard.cardSn, field }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'AI 생성에 실패했습니다.');
      }
      const data = await res.json();
      const value = data.value ?? '';
      if (field === 'firstLine') setInstagramFirstLine(value);
      else if (field === 'body') setInstagramBody(value);
      else setInstagramHashtags(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingField(null);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !formContent.trim() || !token) return;
    setSaving(true);
    setError(null);
    try {
      const url = editingId
        ? `${API_BASE}/api/v1/card-sns-posts/${editingId}`
        : `${API_BASE}/api/v1/card-sns-posts`;
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId
        ? { content: formContent.trim(), platform: formPlatform.trim() || null, status: formStatus }
        : { card_sn: selectedCard.cardSn, content: formContent.trim(), platform: formPlatform.trim() || null, status: formStatus };
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '저장에 실패했습니다.');
      }
      setFormContent('');
      setFormPlatform('');
      setFormStatus('draft');
      setEditingId(null);
      if (selectedCard) fetchPosts(selectedCard.cardSn);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (post: SnsPost) => {
    setEditingId(post.id);
    setEditContent(post.content);
    setEditPlatform(post.platform || '');
    setEditStatus(post.status);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId == null || !token) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/card-sns-posts/${editingId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          content: editContent.trim(),
          platform: editPlatform.trim() || null,
          status: editStatus,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '수정에 실패했습니다.');
      }
      setEditingId(null);
      if (selectedCard) fetchPosts(selectedCard.cardSn);
    } catch (e) {
      setError(e instanceof Error ? e.message : '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!token || !confirm('이 게시물을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/card-sns-posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      if (editingId === postId) setEditingId(null);
      if (selectedCard) fetchPosts(selectedCard.cardSn);
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">게시물 관리</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        제작한 카드(cards)를 선택한 뒤, 해당 카드에 대한 SNS 게시문을 작성·관리합니다.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 카드 선택 영역 */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">카드 선택</h2>
          {loadingCards ? (
            <div className="flex items-center justify-center py-8 text-gray-500">로딩 중...</div>
          ) : (
            <ul className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-[420px] overflow-y-auto">
              {cards.map((card) => {
                const imgUrl = getImageUrl(card.generatedImageUrl || card.characterImageUrl || card.draftImageUrl);
                const isSelected = selectedCard?.cardSn === card.cardSn;
                return (
                  <li key={card.cardSn}>
                    <button
                      type="button"
                      onClick={() => handleSelectCard(card)}
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

        {/* 선택 카드 정보 + 게시물 작성/목록 */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedCard ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-500 dark:text-gray-400">
              왼쪽에서 카드를 선택하세요.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">선택 카드</h2>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center text-3xl text-gray-400"
                    style={{ aspectRatio: '1' }}
                  >
                    {getImageUrl(
                      selectedCard.generatedImageUrl || selectedCard.characterImageUrl || selectedCard.draftImageUrl
                    ) ? (
                      <img
                        src={
                          getImageUrl(
                            selectedCard.generatedImageUrl ||
                              selectedCard.characterImageUrl ||
                              selectedCard.draftImageUrl
                          )!
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>🎴</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{selectedCard.cardName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      #{selectedCard.cardSn} · {selectedCard.type} · {selectedCard.attribute}
                      {selectedCard.gender && ` · ${selectedCard.gender}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* 인스타그램 업로드용 템플릿 */}
              {selectedCard && !editingId && (
                <div className="rounded-lg border border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-900/20 dark:to-purple-900/20 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <FiImage className="w-4 h-4 text-pink-500" />
                      인스타그램 업로드용 템플릿
                    </h2>
                    <button
                      type="button"
                      onClick={handleGenerateInstagramCaption}
                      disabled={generatingCaption}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiZap className="w-4 h-4" />
                      {generatingCaption ? '생성 중...' : 'AI로 생성'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    첫 줄(미리보기)·본문·해시태그를 입력한 뒤 &quot;캡션에 적용&quot;을 누르면 게시문 본문에 반영됩니다. (캡션 최대 2,200자)
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">한 줄 소개 (미리보기에 노출)</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleGenerateInstagramCaptionSingle('firstLine')}
                            disabled={generatingField !== null}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="AI로 이 항목만 생성"
                          >
                            <FiZap className="w-3.5 h-3.5" />
                            {generatingField === 'firstLine' ? '생성 중...' : 'AI 생성'}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(instagramFirstLine, 'firstLine')}
                            disabled={!instagramFirstLine.trim()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="클립보드 복사"
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                            {copiedField === 'firstLine' ? '복사됨' : '복사'}
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={instagramFirstLine}
                        onChange={(e) => setInstagramFirstLine(e.target.value)}
                        placeholder="예: 오늘의 카드 - [카드명]"
                        maxLength={100}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">본문</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleGenerateInstagramCaptionSingle('body')}
                            disabled={generatingField !== null}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="AI로 이 항목만 생성"
                          >
                            <FiZap className="w-3.5 h-3.5" />
                            {generatingField === 'body' ? '생성 중...' : 'AI 생성'}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(instagramBody, 'body')}
                            disabled={!instagramBody.trim()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="클립보드 복사"
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                            {copiedField === 'body' ? '복사됨' : '복사'}
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={instagramBody}
                        onChange={(e) => setInstagramBody(e.target.value)}
                        rows={3}
                        placeholder="설명이나 스토리를 입력하세요."
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">해시태그 (공백 또는 쉼표 구분, # 없어도 자동 추가)</label>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleGenerateInstagramCaptionSingle('hashtags')}
                            disabled={generatingField !== null}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="AI로 이 항목만 생성"
                          >
                            <FiZap className="w-3.5 h-3.5" />
                            {generatingField === 'hashtags' ? '생성 중...' : 'AI 생성'}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(instagramHashtags, 'hashtags')}
                            disabled={!instagramHashtags.trim()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="클립보드 복사"
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                            {copiedField === 'hashtags' ? '복사됨' : '복사'}
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={instagramHashtags}
                        onChange={(e) => setInstagramHashtags(e.target.value)}
                        placeholder="예: 카드게임 트레이딩카드 일러스트"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-xs ${instagramCaptionLength > INSTAGRAM_CAPTION_MAX ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {instagramCaptionLength} / {INSTAGRAM_CAPTION_MAX}자
                      </span>
                      <button
                        type="button"
                        onClick={applyInstagramTemplateToCaption}
                        disabled={!instagramCaption.trim() || instagramCaptionLength > INSTAGRAM_CAPTION_MAX}
                        className="px-3 py-1.5 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        캡션에 적용
                      </button>
                    </div>
                  </div>
                  {/* 인스타그램 피드 비율 미리보기 (4:5) */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">피드 미리보기 (4:5)</span>
                      <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setPreviewFit('contain')}
                          className={`px-2 py-1 text-xs ${previewFit === 'contain' ? 'bg-pink-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                        >
                          전체 보이기
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFit('cover')}
                          className={`px-2 py-1 text-xs ${previewFit === 'cover' ? 'bg-pink-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                        >
                          꽉 채우기
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
                      {previewFit === 'contain' ? '이미지가 잘리지 않고 전부 보입니다. 업로드 시 여백이 생길 수 있습니다.' : '비율에 맞춰 꽉 채워집니다. 업로드 시 일부가 잘릴 수 있습니다.'}
                    </p>
                    <div
                      className="mx-auto rounded-lg overflow-hidden bg-white border border-gray-300 dark:border-gray-600 shadow-lg max-w-[240px]"
                      style={{ aspectRatio: `${INSTAGRAM_FEED_ASPECT.w} / ${INSTAGRAM_FEED_ASPECT.h}` }}
                    >
                      {getImageUrl(
                        selectedCard.generatedImageUrl || selectedCard.characterImageUrl || selectedCard.draftImageUrl
                      ) ? (
                        <img
                          src={
                            getImageUrl(
                              selectedCard.generatedImageUrl ||
                                selectedCard.characterImageUrl ||
                                selectedCard.draftImageUrl
                            )!
                          }
                          alt=""
                          className={`w-full h-full ${previewFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">🎴</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 새 게시물 작성 / 수정 폼 */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {editingId ? '게시물 수정' : '새 SNS 게시문 작성'}
                </h2>
                {!token ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">로그인 후 게시물을 작성할 수 있습니다.</p>
                ) : (
                  <form onSubmit={editingId ? handleUpdatePost : handleSubmitPost} className="space-y-3">
                    {editingId ? (
                      <>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                          placeholder="게시물 본문"
                          required
                        />
                        <div className="flex flex-wrap gap-3">
                          <input
                            type="text"
                            value={editPlatform}
                            onChange={(e) => setEditPlatform(e.target.value)}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm w-32"
                            placeholder="플랫폼"
                          />
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm"
                          >
                            <option value="draft">초안</option>
                            <option value="published">게시완료</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:underline"
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                          >
                            <FiSave className="w-4 h-4" />
                            수정
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <textarea
                          value={formContent}
                          onChange={(e) => setFormContent(e.target.value)}
                          rows={4}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                          placeholder="SNS 게시물 본문을 입력하세요."
                          required
                        />
                        <div className="flex flex-wrap gap-3">
                          <input
                            type="text"
                            value={formPlatform}
                            onChange={(e) => setFormPlatform(e.target.value)}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm w-32"
                            placeholder="플랫폼 (선택)"
                          />
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value)}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm"
                          >
                            <option value="draft">초안</option>
                            <option value="published">게시완료</option>
                          </select>
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                          >
                            <FiSave className="w-4 h-4" />
                            저장
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}
              </div>

              {/* 해당 카드 게시물 목록 */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">이 카드의 게시물</h2>
                {loadingPosts ? (
                  <p className="text-sm text-gray-500">로딩 중...</p>
                ) : posts.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">아직 작성된 게시물이 없습니다.</p>
                ) : (
                  <ul className="space-y-3">
                    {posts.map((post) => (
                      <li
                        key={post.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{post.content}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                              {post.platform && <span>{post.platform}</span>}
                              <span>{post.status === 'published' ? '게시완료' : '초안'}</span>
                              <span>{new Date(post.updatedAt).toLocaleString('ko-KR')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEdit(post)}
                              className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                              title="수정"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(post.id)}
                              className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="삭제"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
