'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE, getStoredToken } from '@/app/lib/auth';
import { FiSave, FiTrash2, FiEdit2, FiZap } from 'react-icons/fi';

const INSTAGRAM_CAPTION_MAX = 2200;
const INSTAGRAM_FEED_ASPECT = { w: 4, h: 5 }; // 4:5 권장

// RGB(0-255) -> HSL(0-1)
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

interface Card {
  cardSn: number;
  cardNumber?: string;
  cardName: string;
  type: string;
  attribute: string;
  rarity: string;
  gender?: string;
  series?: string;
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
  const [formPlatform, setFormPlatform] = useState('instagram');
  const [formStatus, setFormStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPlatform, setEditPlatform] = useState('instagram');
  const [editStatus, setEditStatus] = useState('draft');

  const [generatingCaption, setGeneratingCaption] = useState(false);

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
    setFormPlatform('instagram');
    setFormStatus('draft');
    setEditingId(null);
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
      const firstLine = (data.firstLine ?? '').trim();
      const body = (data.body ?? '').trim();
      const hashtags = (data.hashtags ?? '').trim();
      const fixedTags = '#NCACO #AI #FATE #TCG #CARD #ART';
      const hashtagsWithFixed = hashtags ? `${hashtags} ${fixedTags}` : fixedTags;

      const fixedFooter =
        '---\n\n' +
        '다음 카드의 주인공은 여러분이 정합니다.\n\n' +
        '댓글로 설정을 남겨주시면, 참고하여 다음 TCG 카드로 제작하겠습니다.\n\n' +
        '아래 양식을 복사해서 작성해주세요.\n\n' +
        '이름 : (대상)\n' +
        '성별 : (남성/여성)\n' +
        '속성 : (불/물/흙/바람/빛/금속/얼음/자연/번개/어둠)\n' +
        '클래스 : (세이버/랜서/아처/라이더/캐스터/어새신/버서커/룰러/어벤저/얼터에고)\n\n' +
        '여러분의 설정이 새로운 세계관이 됩니다.\n' +
        '가장 흥미로운 조합을 다음 카드로 구현하겠습니다.';

      const fullCaption = [firstLine, body, hashtagsWithFixed, fixedFooter].filter(Boolean).join('\n\n');
      setFormContent(fullCaption);
      setFormPlatform((prev) => prev || 'instagram');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleDownloadInstagramImage = async () => {
    if (!selectedCard) return;
    const src = getImageUrl(
      selectedCard.generatedImageUrl || selectedCard.characterImageUrl || selectedCard.draftImageUrl
    );
    if (!src) {
      setError('다운로드할 카드 이미지를 찾을 수 없습니다.');
      return;
    }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
      });

      // 지배색(대략적인 평균색) 추출을 위한 다운샘플링
      const sampleSize = 64;
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = sampleSize;
      offscreenCanvas.height = sampleSize;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      if (!offscreenCtx) throw new Error('색상을 분석할 수 없습니다.');

      offscreenCtx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const imageData = offscreenCtx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        if (alpha < 32) continue; // 거의 투명한 픽셀은 제외
        rSum += r;
        gSum += g;
        bSum += b;
        count += 1;
      }

      const avgR = count ? rSum / count : 20;
      const avgG = count ? gSum / count : 20;
      const avgB = count ? bSum / count : 30;

      // 평균색 기준 지배색 + 보색 계산 (HSL에서 180도 회전)
      const [h, s, l] = rgbToHsl(avgR, avgG, avgB);
      const baseH = h;
      const baseS = s * 0.8;
      const baseL = Math.min(0.4, l * 0.7 + 0.1); // 너무 밝지 않게 조정

      const compH = (h + 0.5) % 1; // 보색 (180도)
      const compS = baseS;
      const compL = baseL;

      const [baseR, baseG, baseB] = hslToRgb(baseH, baseS, baseL);
      const [compR, compG, compB] = hslToRgb(compH, compS, compL);

      // 4:5 비율의 고해상도 캔버스 (인스타 게시용)
      const targetWidth = 2048;
      const targetHeight = Math.round((targetWidth * INSTAGRAM_FEED_ASPECT.h) / INSTAGRAM_FEED_ASPECT.w); // 2560

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas를 초기화할 수 없습니다.');

      // 배경: 카드 이미지를 1.5배 확대한 후, 아주 낮은 투명도로 전체에 깔기
      // 먼저 지배색/보색 블렌드로 기본 그라디언트를 깔고
      const gradient = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
      const midR = Math.round(baseR * 0.6 + compR * 0.4);
      const midG = Math.round(baseG * 0.6 + compG * 0.4);
      const midB = Math.round(baseB * 0.6 + compB * 0.4);
      gradient.addColorStop(0, `rgb(${baseR}, ${baseG}, ${baseB})`);
      gradient.addColorStop(0.5, `rgb(${midR}, ${midG}, ${midB})`);
      gradient.addColorStop(1, `rgb(${compR}, ${compG}, ${compB})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // 그 위에 카드 이미지를 1.5배로 확대해서, 매우 낮은 투명도로 오버레이
      const bgScale = Math.min(targetWidth / img.width, targetHeight / img.height) * 1.5;
      const bgW = img.width * bgScale;
      const bgH = img.height * bgScale;
      const bgX = (targetWidth - bgW) / 2;
      const bgY = (targetHeight - bgH) / 2;

      ctx.save();
      ctx.globalAlpha = 0.12; // 아주 옅게
      ctx.filter = 'blur(2px)'; // 살짝 블러를 줘서 카드와 겹쳐도 거슬리지 않게
      ctx.drawImage(img, bgX, bgY, bgW, bgH);
      ctx.restore();

      // 비네팅
      const vignette = ctx.createRadialGradient(
        targetWidth / 2,
        targetHeight / 2,
        Math.min(targetWidth, targetHeight) / 4,
        targetWidth / 2,
        targetHeight / 2,
        Math.max(targetWidth, targetHeight) / 1.1,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // 원본 비율을 유지하면서 4:5 캔버스 안에 최대한 크게 맞추되, 살짝 여백을 더 주기 위해 스케일을 약간 줄임
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height) * 0.95;
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const dx = (targetWidth - drawWidth) / 2;
      const dy = (targetHeight - drawHeight) / 2;

      // 이미지 본체를 라운드 카드처럼 그리기 (라운드 정도를 약간 줄임)
      const radius = 70;
      const cardX = dx;
      const cardY = dy;
      const cardW = drawWidth;
      const cardH = drawHeight;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cardX + radius, cardY);
      ctx.lineTo(cardX + cardW - radius, cardY);
      ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
      ctx.lineTo(cardX + cardW, cardY + cardH - radius);
      ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
      ctx.lineTo(cardX + radius, cardY + cardH);
      ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
      ctx.lineTo(cardX, cardY + radius);
      ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
      ctx.closePath();
      ctx.clip();

      // 카드 이미지
      ctx.drawImage(img, cardX, cardY, cardW, cardH);

      ctx.restore();

      // 카드 외곽 글로우/보더 (라운드 값과 동일하게 통일)
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 6;
      ctx.shadowColor = 'rgba(168,85,247,0.6)';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.moveTo(cardX + radius, cardY);
      ctx.lineTo(cardX + cardW - radius, cardY);
      ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
      ctx.lineTo(cardX + cardW, cardY + cardH - radius);
      ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
      ctx.lineTo(cardX + radius, cardY + cardH);
      ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
      ctx.lineTo(cardX, cardY + radius);
      ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError('이미지 다운로드에 실패했습니다. 다시 시도해 주세요.');
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const safeName = (selectedCard.cardName || 'card').replace(/[\\\/:*?"<>|]/g, '_');
          link.download = `instagram_${selectedCard.cardSn}_${safeName}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        },
        'image/png',
        1,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 다운로드에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = formContent.trim();
    if (!selectedCard || !finalContent || !token) return;
    setSaving(true);
    setError(null);
    try {
      const url = editingId
        ? `${API_BASE}/api/v1/card-sns-posts/${editingId}`
        : `${API_BASE}/api/v1/card-sns-posts`;
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId
        ? { content: formContent.trim(), platform: editPlatform.trim() || null, status: editStatus }
        : {
            card_sn: selectedCard.cardSn,
            content: finalContent,
            platform: formPlatform.trim() || null,
            status: formStatus,
          };
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
        {/* 카드 선택 영역 (좌측) */}
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

        {/* 가운데: 선택 카드 이미지 프리뷰 */}
        <div className="lg:col-span-1">
          {!selectedCard ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center text-gray-500 dark:text-gray-400 text-sm h-full flex items-center justify-center">
              카드를 선택하면<br />여기에 이미지가 표시됩니다.
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 h-full flex flex-col items-center justify-between gap-3">
              <div className="w-full flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">인스타그램 4:5 미리보기</div>
                <button
                  type="button"
                  onClick={handleDownloadInstagramImage}
                  className="text-[11px] px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  4:5 이미지 다운로드
                </button>
              </div>
              <div
                className="w-full max-w-[300px] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-md"
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
                    className="w-full h-full object-contain bg-white"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 bg-white">
                    🎴
                  </div>
                )}
              </div>
              <div className="mt-1 text-center">
                <div className="text-xs font-semibold text-gray-900 dark:text-white">{selectedCard.cardName}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  #{selectedCard.cardSn} · {selectedCard.type} · {selectedCard.attribute}
                  {selectedCard.gender && ` · ${selectedCard.gender}`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 게시물 작성/목록 (선택 카드 정보는 얇은 헤더로만) */}
        <div className="lg:col-span-1 space-y-6">
          {!selectedCard ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-500 dark:text-gray-400">
              왼쪽에서 카드를 선택하세요.
            </div>
          ) : (
            <>
              {/* 얇은 선택 카드 요약 박스 */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">선택 카드</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {selectedCard.cardName}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      #{selectedCard.cardSn} · {selectedCard.type} · {selectedCard.attribute}
                      {selectedCard.gender && ` · ${selectedCard.gender}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* 새 게시물 작성 / 수정 폼 */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {editingId ? '게시물 수정' : '새 SNS 게시문 작성'}
                  </h2>
                  {!editingId && token && selectedCard && (
                    <button
                      type="button"
                      onClick={handleGenerateInstagramCaption}
                      disabled={generatingCaption || saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiZap className="w-4 h-4" />
                      {generatingCaption ? 'AI 생성 중...' : 'AI로 캡션 생성'}
                    </button>
                  )}
                </div>
                {!token ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">로그인 후 게시물을 작성할 수 있습니다.</p>
                ) : (
                  <form onSubmit={editingId ? handleUpdatePost : handleSubmitPost} className="space-y-3">
                    {editingId ? (
                      <>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={8}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                          placeholder="게시물 본문"
                          required
                        />
                        <div className="flex flex-wrap gap-3">
                          <select
                            value={editPlatform}
                            onChange={(e) => setEditPlatform(e.target.value)}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm w-40"
                          >
                            <option value="instagram">Instagram</option>
                            <option value="twitter">Twitter / X</option>
                            <option value="facebook">Facebook</option>
                            <option value="etc">기타</option>
                          </select>
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
                          rows={8}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                          placeholder="SNS 게시물 본문을 직접 입력하거나, AI 버튼으로 자동 생성해 보세요."
                        />
                        <div className="flex flex-wrap gap-3">
                          <select
                            value={formPlatform}
                            onChange={(e) => setFormPlatform(e.target.value)}
                            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm w-40"
                          >
                            <option value="instagram">Instagram</option>
                            <option value="twitter">Twitter / X</option>
                            <option value="facebook">Facebook</option>
                            <option value="etc">기타</option>
                          </select>
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
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
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
