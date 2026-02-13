'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { FiClipboard, FiPlus, FiTrash2, FiDownload, FiUpload } from 'react-icons/fi';
import { buildPrompt } from '../../lib/promptBuilder';
import { getStoredToken } from '../../lib/auth';
import ConfirmModal from '../../components/ConfirmModal';
import LoadingMask from '../../components/LoadingMask';

interface Card {
  cardSn: number;
  cardNumber?: string;
  cardName: string;
  type: string;
  attribute: string;
  rarity: string;
  attack: string;
  health: string;
  skill1Name?: string;
  skill1Description?: string;
  skill2Name?: string;
  skill2Description?: string;
  flavorText?: string;
  series?: string;
  characterImageUrl?: string;
  backgroundImageUrl?: string;
  generatedImageUrl?: string;
  // 백엔드에서 추가로 내려주는 최초 생성 이미지(초안) URL
  draftImageUrl?: string;
  generatedPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CardListResponse {
  success: boolean;
  total: number;
  cards: Card[];
}

export default function CardPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; card: Card | null }>({
    isOpen: false,
    card: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingGenImage, setIsUploadingGenImage] = useState(false);
  const [isDeletingGenImage, setIsDeletingGenImage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingCardZip, setIsDownloadingCardZip] = useState(false);
  const generatedImageInputRef = useRef<HTMLInputElement>(null);
  const imageScrollRef = useRef<HTMLDivElement>(null);

  // 특정 인덱스의 이미지를 가운데로 스크롤하는 유틸 함수
  const scrollToImage = (index: number) => {
    const container = imageScrollRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLDivElement>('[data-image-card]');
    const target = cards[index];
    if (!target) return;

    const containerWidth = container.clientWidth;
    const targetCenter = target.offsetLeft + target.offsetWidth / 2;
    const rawScrollLeft = targetCenter - containerWidth / 2;

    // 스크롤 가능한 범위 내로 클램핑 (마지막 카드에서는 가장 끝까지)
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const scrollLeft = Math.min(Math.max(rawScrollLeft, 0), Math.max(maxScrollLeft, 0));

    container.scrollTo({
      left: scrollLeft,
      behavior: 'smooth',
    });
  };

  // 카드 상세가 열릴 때 현재 선택된 이미지를 가운데로 정렬
  useEffect(() => {
    if (!selectedCard || !isSlideOpen) return;
    scrollToImage(selectedImageIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCard, isSlideOpen]);

  // 선택 인덱스가 변경될 때마다 해당 이미지를 가운데로 스크롤
  useEffect(() => {
    if (!selectedCard || !isSlideOpen) return;
    scrollToImage(selectedImageIndex);
  }, [selectedImageIndex, selectedCard, isSlideOpen]);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://localhost:8000/api/v1/cards/list?limit=100');
        if (!response.ok) {
          throw new Error('카드 목록을 불러오는데 실패했습니다.');
        }

        const data: CardListResponse = await response.json();
        setCards(data.cards);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('data:image/')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;

    let path = url.trim();
    if (path.startsWith('/data/upload/') || path.startsWith('/data/upload')) {
      path = path.replace(/\/+/g, '/');
      return `http://localhost:8000${path}`;
    }
    if (path.startsWith('/upload/') || path.startsWith('/upload')) {
      path = `/data${path}`;
      path = path.replace(/\/+/g, '/');
      return `http://localhost:8000${path}`;
    }
    if (!path.startsWith('/')) path = `/${path}`;
    path = `/data/upload${path}`;
    path = path.replace(/\/+/g, '/');
    return `http://localhost:8000${path}`;
  };

  /**
   * 카드 상세에서 사용할 이미지 리스트 구성
   * 기본 정렬 순서 (왼쪽 → 오른쪽):
   * - 1) 합성 이미지들: 최신 합성부터 역순 (합성2, 합성1, ...)
   * - 2) 초안: draftImageUrl (최초 생성 이미지)
   * - 3) 원본: characterImageUrl > backgroundImageUrl
   */
  const buildCardImages = (card: Card) => {
    const images: { key: string; url: string; label: string }[] = [];

    const compositeImages: { key: string; url: string; label: string }[] = [];
    let draftImage: { key: string; url: string; label: string } | null = null;
    let baseImage: { key: string; url: string; label: string } | null = null;

    // 원본 카드 이미지 (캐릭터 > 배경)
    const baseUrl = getImageUrl(card.characterImageUrl || card.backgroundImageUrl);
    if (baseUrl) {
      baseImage = {
        key: 'base',
        url: baseUrl,
        label: '원본',
      };
    }

    // 초안 이미지 (최초 생성 이미지)
    if (card.draftImageUrl) {
      const draftUrl = getImageUrl(card.draftImageUrl);
      if (draftUrl) {
        draftImage = {
          key: 'draft',
          url: draftUrl,
          label: '초안',
        };
      }
    }

    // 초안 URL과 동일한 경로 제외용 (같은 이미지가 합성1로 중복 표시되지 않도록)
    const draftUrlNormalized = card.draftImageUrl ? getImageUrl(card.draftImageUrl) : null;

    // 합성이미지들 (등록 순서대로: 합성1, 합성2, ...) — 초안(draftImageUrl)과 같은 URL은 제외
    if (generatedImageUrls.length > 0) {
      const compositeUrls = generatedImageUrls
        .map((raw) => getImageUrl(raw))
        .filter((url): url is string => !!url && url !== draftUrlNormalized);
      const seen = new Set<string>();
      compositeUrls.forEach((genUrl) => {
        if (seen.has(genUrl)) return;
        seen.add(genUrl);
        compositeImages.push({
          key: `generated-${compositeImages.length}`,
          url: genUrl,
          label: `합성${compositeImages.length + 1}`,
        });
      });
    } else if (card.generatedImageUrl) {
      // 백엔드 목록 조회 이전에는 단일 generatedImageUrl 이라도 활용 (초안과 동일 URL이면 제외)
      const genUrl = getImageUrl(card.generatedImageUrl);
      if (genUrl && genUrl !== draftUrlNormalized) {
        compositeImages.push({
          key: 'generated-latest',
          url: genUrl,
          label: '합성1',
        });
      }
    }

    // 1) 합성이미지: 최신 것이 먼저 오도록 역순 정렬
    if (compositeImages.length > 0) {
      compositeImages
        .slice()
        .reverse()
        .forEach((img) => images.push(img));
    }

    // 2) 초안
    if (draftImage && !images.some((img) => img.url === draftImage!.url)) {
      images.push(draftImage);
    }

    // 3) 원본
    if (baseImage && !images.some((img) => img.url === baseImage!.url)) {
      images.push(baseImage);
    }

    return images;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const generatePromptFromCard = (card: Card) =>
    buildPrompt({
      type: card.type,
      rarity: card.rarity,
      cardName: card.cardName,
      attribute: card.attribute,
      attack: card.attack,
      health: card.health,
      cardNumber: card.cardNumber || String(card.cardSn),
      skill1Name: card.skill1Name,
      skill1Description: card.skill1Description,
      skill2Name: card.skill2Name,
      skill2Description: card.skill2Description,
      flavorText: card.flavorText,
      series: card.series,
      characterImageRef: card.characterImageUrl || '없음',
      backgroundImageRef: card.backgroundImageUrl || '없음',
    });

  const handleCardClick = async (card: Card) => {
    setSelectedCard(card);
    setSelectedImageIndex(0); // 상세 열릴 때 항상 첫 이미지를 선택
    setIsSlideOpen(true);

    // 카드별 합성이미지 전체 목록 조회
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/cards/${card.cardSn}/generated-images`,
      );
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; images?: string[] };
        setGeneratedImageUrls(data.images ?? []);
      } else {
        setGeneratedImageUrls([]);
      }
    } catch {
      setGeneratedImageUrls([]);
    }
  };

  const handleCloseSlide = () => {
    setIsSlideOpen(false);
    setTimeout(() => {
      setSelectedCard(null);
      setGeneratedImageUrls([]);
      setIsFullscreen(false);
      setFullscreenIndex(0);
    }, 300);
  };

  const handleDownloadCardZip = async () => {
    if (!selectedCard) return;

    try {
      setIsDownloadingCardZip(true);
      const response = await fetch(
        `http://localhost:8000/api/v1/cards/${selectedCard.cardSn}/download-zip`,
      );

      if (!response.ok) {
        throw new Error('카드 ZIP 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `card_${selectedCard.cardSn}_pk.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '카드 ZIP 다운로드 중 오류가 발생했습니다.');
      console.error('카드 ZIP 다운로드 오류:', err);
    } finally {
      setIsDownloadingCardZip(false);
    }
  };

  const handleDownloadAllZip = async () => {
    try {
      setIsDownloadingZip(true);
      const response = await fetch('http://localhost:8000/api/v1/cards/download-zip');

      if (!response.ok) {
        throw new Error('카드 ZIP 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cards_pk.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '카드 ZIP 다운로드 중 오류가 발생했습니다.');
      console.error('카드 ZIP 다운로드 오류:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!selectedCard) return;

    try {
      const imageUrl = getImageUrl(
        selectedCard.generatedImageUrl ||
          selectedCard.characterImageUrl ||
          selectedCard.backgroundImageUrl,
      );

      if (!imageUrl) {
        alert('다운로드할 이미지가 없습니다.');
        return;
      }

      // 이미지 다운로드
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedCard.cardName || 'card'}_${selectedCard.cardSn}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('이미지 다운로드 중 오류가 발생했습니다.');
      console.error('다운로드 오류:', err);
    }
  };

  const handleDeleteCard = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    setDeleteModal({ isOpen: true, card });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.card) return;

    const card = deleteModal.card;
    const token = getStoredToken();

    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`http://localhost:8000/api/v1/cards/${card.cardSn}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '삭제에 실패했습니다.' }));
        throw new Error(errorData.detail || '카드 삭제에 실패했습니다.');
      }

      // 삭제 성공 시 목록에서 제거
      setCards((prevCards) => prevCards.filter((c) => c.cardSn !== card.cardSn));

      // 삭제된 카드가 현재 선택된 카드라면 슬라이드 닫기
      if (selectedCard?.cardSn === card.cardSn) {
        handleCloseSlide();
      }

      // 모달 닫기
      setDeleteModal({ isOpen: false, card: null });
    } catch (err) {
      alert(err instanceof Error ? err.message : '카드 삭제 중 오류가 발생했습니다.');
      // 에러 발생 시 모달은 유지
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddGeneratedImageClick = () => {
    generatedImageInputRef.current?.click();
  };

  const handleGeneratedImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCard) return;

    try {
      setIsUploadingGenImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `http://localhost:8000/api/v1/cards/${selectedCard.cardSn}/generated-image`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: '등록에 실패했습니다.' }));
        throw new Error(errData.detail || '합성이미지 등록에 실패했습니다.');
      }

      const data = (await response.json()) as { imageUrl?: string };

      // 목록 재조회하여 갱신된 generatedImageUrl 반영
      const listRes = await fetch('http://localhost:8000/api/v1/cards/list?limit=100');
      if (listRes.ok) {
        const listData: CardListResponse = await listRes.json();
        setCards(listData.cards);
        const updated = listData.cards.find((c) => c.cardSn === selectedCard.cardSn);
        if (updated) setSelectedCard(updated);
      } else if (data.imageUrl) {
        setSelectedCard((prev) =>
          prev ? { ...prev, generatedImageUrl: data.imageUrl } : null,
        );
        setCards((prev) =>
          prev.map((c) =>
            c.cardSn === selectedCard.cardSn
              ? { ...c, generatedImageUrl: data.imageUrl }
              : c,
          ),
        );
      }

      // 합성이미지 전체 목록 재조회
      try {
        const genRes = await fetch(
          `http://localhost:8000/api/v1/cards/${selectedCard.cardSn}/generated-images`,
        );
        if (genRes.ok) {
          const genData = (await genRes.json()) as {
            success: boolean;
            images?: string[];
          };
          setGeneratedImageUrls(genData.images ?? []);
        }
      } catch {
        // 무시
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '합성이미지 등록 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingGenImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteGeneratedImage = async () => {
    if (!selectedCard) return;

    if (!selectedCard.generatedImageUrl) {
      alert('삭제할 합성이미지가 없습니다.');
      return;
    }

    if (!confirm('가장 최근 합성이미지를 삭제하시겠습니까?')) {
      return;
    }

    const token = getStoredToken();
    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setIsDeletingGenImage(true);
      const response = await fetch(
        `http://localhost:8000/api/v1/cards/${selectedCard.cardSn}/generated-image`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: '삭제에 실패했습니다.' }));
        throw new Error(errData.detail || '합성이미지 삭제에 실패했습니다.');
      }

      // 삭제 후 목록 재조회하여 최신 합성이미지 상태 반영
      const listRes = await fetch('http://localhost:8000/api/v1/cards/list?limit=100');
      if (listRes.ok) {
        const listData: CardListResponse = await listRes.json();
        setCards(listData.cards);
        const updated = listData.cards.find((c) => c.cardSn === selectedCard.cardSn);
        if (updated) {
          setSelectedCard(updated);
        }
      }

      // 합성이미지 전체 목록 재조회
      try {
        const genRes = await fetch(
          `http://localhost:8000/api/v1/cards/${selectedCard.cardSn}/generated-images`,
        );
        if (genRes.ok) {
          const genData = (await genRes.json()) as {
            success: boolean;
            images?: string[];
          };
          const urls = genData.images ?? [];
          setGeneratedImageUrls(urls);

          if (urls.length === 0) {
            // 더 이상 합성이미지가 없으면 기본 선택 인덱스로 돌리고 전체화면은 닫는다.
            setSelectedImageIndex(0);
            setFullscreenIndex(0);
            setIsFullscreen(false);
          } else {
            // 최신 합성이미지가 맨 앞으로 오도록 정렬하므로, 항상 첫 번째 합성 이미지를 선택
            setSelectedImageIndex(0);
            setFullscreenIndex(0);
          }
        }
      } catch {
        // 무시
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '합성이미지 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingGenImage(false);
    }
  };

  // 상세 썸네일 클릭 시 동작: 다른 이미지는 선택만, 이미 선택된 이미지를 한 번 더 클릭하면 전체화면 진입
  const handleDetailImageClick = (index: number) => {
    setSelectedImageIndex((prev) => {
      if (prev === index) {
        setFullscreenIndex(index);
        setIsFullscreen(true);
        return prev;
      }
      return index;
    });
  };

  // 키보드 이벤트 (전체화면에서 방향키/ESC 처리, 상세 열려있을 때 ESC로 닫기)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCard) return;

      if (isFullscreen) {
        const images = buildCardImages(selectedCard);
        if (images.length === 0) return;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setFullscreenIndex((prev) => {
            const next = (prev - 1 + images.length) % images.length;
            setSelectedImageIndex(next);
            return next;
          });
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setFullscreenIndex((prev) => {
            const next = (prev + 1) % images.length;
            setSelectedImageIndex(next);
            return next;
          });
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsFullscreen(false);
          return;
        }
      } else if (isSlideOpen && e.key === 'Escape') {
        e.preventDefault();
        handleCloseSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, isSlideOpen, selectedCard, selectedImageIndex]);

  const actionBar = (
    <div className="flex justify-end gap-2 mb-4">
      <button
        type="button"
        onClick={handleDownloadAllZip}
        disabled={isDownloadingZip}
        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <FiDownload className="h-4 w-4" />
        {isDownloadingZip ? 'ZIP 생성 중...' : '카드 전체 ZIP 다운로드'}
      </button>
      <Link
        href="/"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        aria-label="카드 생성"
        title="카드 생성"
      >
        <FiPlus className="h-4 w-4" />
      </Link>
    </div>
  );

  let content: React.ReactNode = null;

  if (loading) {
    content = (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  } else if (cards.length === 0) {
    content = (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-gray-500 dark:text-gray-400">
        카드가 없습니다.
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {cards.map((card) => {
          const imageUrl = getImageUrl(
            card.generatedImageUrl || card.characterImageUrl || card.backgroundImageUrl,
          );

          return (
            <div key={card.cardSn} className="group relative">
              {/* 삭제 버튼을 카드 앞(상단)에 배치 */}
              <div className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={(e) => handleDeleteCard(e, card)}
                  className="h-8 w-8 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-lg transition-colors"
                  aria-label="카드 삭제"
                  title="카드 삭제"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div
                onClick={() => handleCardClick(card)}
                className="bg-transparent rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
                style={{ aspectRatio: '1024/1536' }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={card.cardName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.image-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className =
                          'image-fallback w-full h-full flex items-center justify-center text-gray-400 bg-gray-300 dark:bg-gray-600';
                        fallback.innerHTML = '<span class="text-4xl">🎴</span>';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-300 dark:bg-gray-600">
                    <span className="text-4xl">🎴</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const promptText = selectedCard
    ? selectedCard.generatedPrompt ?? generatePromptFromCard(selectedCard)
    : '';

  return (
    <div className="relative">
      {actionBar}
      {content}

      {selectedCard && (
        <>
          <div
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
              isSlideOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={handleCloseSlide}
          />

          <div
            className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
              isSlideOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="h-full flex flex-col overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 min-h-10 flex items-center justify-between z-10">
                <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                  카드 상세 정보
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadCardZip}
                    disabled={isDownloadingCardZip}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    aria-label="카드 ZIP 다운로드"
                    title="카드 ZIP 다운로드"
                  >
                    <FiDownload className="w-4 h-4" />
                    <span>ZIP</span>
                  </button>
                  <button
                    onClick={handleDownloadCard}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="카드 다운로드"
                    title="카드 다운로드"
                  >
                    <FiDownload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={handleCloseSlide}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="닫기"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 px-4 pt-6 pb-4 space-y-4">
                <div className="flex justify-center">
                  <div
                    ref={imageScrollRef}
                    className="max-w-full overflow-x-hidden py-4 no-scrollbar"
                  >
                    <div
                      className="flex gap-6 px-2"
                      style={{ perspective: '1200px' }}
                    >
                      {(() => {
                        const images = buildCardImages(selectedCard);

                        if (images.length === 0) {
                          return (
                            <div
                              className="flex-none relative bg-transparent rounded-lg overflow-hidden shadow-lg flex items-center justify-center text-gray-400"
                              style={{ width: '200px', aspectRatio: '1024/1536' }}
                            >
                              <span className="text-4xl">🎴</span>
                            </div>
                          );
                        }

                        return (
                          <>
                            {/* 왼쪽 여백: 처음 카드가 가운데부터 시작되도록 */}
                            <div className="flex-none" style={{ width: '50%' }} />
                            {images.map((img, index) => {
                              const isSelected = index === selectedImageIndex;
                              const offset = index - selectedImageIndex;
                              const clampedOffset = Math.max(-2, Math.min(2, offset));
                              const rotateY = clampedOffset * 10; // 좌우 회전 약간 완화
                              const translateZ = isSelected ? 60 : -30; // 카드 크기 축소에 맞게 깊이 조정
                              const translateY = isSelected ? 0 : 12;
                              const scale = isSelected ? 1.02 : 0.92;

                              return (
                                <div
                                  key={img.key}
                                  className="flex-none cursor-pointer"
                                  data-image-card
                                  style={{ width: '200px' }}
                                  onClick={() => handleDetailImageClick(index)}
                                >
                                  <div
                                    className="relative bg-transparent rounded-lg overflow-hidden shadow-lg transition-transform duration-300 ease-out"
                                    style={{
                                      aspectRatio: '1024/1536',
                                      transform: `translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                                      transformStyle: 'preserve-3d',
                                    }}
                                  >
                                    <img
                                      src={img.url}
                                      alt={img.label}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent && !parent.querySelector('.image-fallback')) {
                                          const fallback = document.createElement('div');
                                          fallback.className =
                                            'image-fallback w-full h-full flex items-center justify-center text-gray-400 bg-gray-300 dark:bg-gray-600';
                                          fallback.innerHTML = '<span class="text-4xl">🎴</span>';
                                          parent.appendChild(fallback);
                                        }
                                      }}
                                    />
                                    {isSelected && (
                                      <div className="absolute inset-0 ring-2 ring-indigo-500/70 pointer-events-none" />
                                    )}
                                  </div>
                                  <div className="mt-2 flex items-center justify-center gap-2">
                                    <span
                                      className={`text-xs ${
                                        isSelected
                                          ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                                          : 'text-gray-600 dark:text-gray-400'
                                      }`}
                                    >
                                      {img.label}
                                    </span>
                                    {isSelected &&
                                      img.key.startsWith('generated-') &&
                                      selectedCard.generatedImageUrl && (
                                        <button
                                          type="button"
                                          onClick={handleDeleteGeneratedImage}
                                          disabled={isDeletingGenImage}
                                          className="inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="합성 이미지 삭제"
                                        >
                                          삭제
                                        </button>
                                      )}
                                  </div>
                                </div>
                              );
                            })}
                            {/* 오른쪽 여백: 마지막 카드도 가운데까지 스크롤 가능하도록 */}
                            <div className="flex-none" style={{ width: '50%' }} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <input
                    ref={generatedImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGeneratedImageFileChange}
                  />
                  <button
                    type="button"
                    onClick={handleAddGeneratedImageClick}
                    disabled={isUploadingGenImage}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiUpload className="h-4 w-4" />
                    {isUploadingGenImage ? '등록 중...' : '생성 이미지 추가'}
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        카드 일련번호
                      </label>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        #{selectedCard.cardSn}
                      </p>
                    </div>
                    {selectedCard.cardNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          카드번호
                        </label>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {selectedCard.cardNumber}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        카드명
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {selectedCard.cardName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        타입
                      </label>
                      <p className="text-base text-gray-900 dark:text-white">
                        {selectedCard.type}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        속성
                      </label>
                      <p className="text-base text-gray-900 dark:text-white">
                        {selectedCard.attribute}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        등급
                      </label>
                      <p className="text-base text-gray-900 dark:text-white">
                        {selectedCard.rarity}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        시리즈
                      </label>
                      <p className="text-base text-gray-900 dark:text-white">
                        {selectedCard.series || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        공격력
                      </label>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ⚔️ {selectedCard.attack}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        체력
                      </label>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ❤️ {selectedCard.health}
                      </p>
                    </div>
                  </div>
                </div>

                {(selectedCard.skill1Name || selectedCard.skill2Name) && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                    {selectedCard.skill1Name && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          스킬 1: {selectedCard.skill1Name}
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedCard.skill1Description || '-'}
                        </p>
                      </div>
                    )}
                    {selectedCard.skill2Name && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          스킬 2: {selectedCard.skill2Name}
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedCard.skill2Description || '-'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedCard.flavorText && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      &ldquo;{selectedCard.flavorText}&rdquo;
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      프롬프트
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (promptText) {
                          void navigator.clipboard?.writeText(promptText);
                        }
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                      aria-label="프롬프트 복사"
                      title="프롬프트 복사"
                    >
                      <FiClipboard className="h-4 w-4" />
                    </button>
                  </div>
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                    {promptText}
                  </pre>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">생성일:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(selectedCard.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">수정일:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(selectedCard.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, card: null })}
        onConfirm={handleConfirmDelete}
        title="카드 삭제"
        message={
          deleteModal.card
            ? `"${deleteModal.card.cardName}" 카드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />

      {/* 로딩 마스크 */}
      <LoadingMask isOpen={isDeleting} message="카드를 삭제하는 중..." />

      {/* 전체화면 카드 뷰어 */}
      {selectedCard && isFullscreen && (
        (() => {
          const images = buildCardImages(selectedCard);
          if (images.length === 0) return null;
          const safeIndex = Math.min(fullscreenIndex, images.length - 1);
          const current = images[safeIndex];

          const goPrev = () => {
            setFullscreenIndex((prev) => {
              const next = (prev - 1 + images.length) % images.length;
              setSelectedImageIndex(next);
              return next;
            });
          };

          const goNext = () => {
            setFullscreenIndex((prev) => {
              const next = (prev + 1) % images.length;
              setSelectedImageIndex(next);
              return next;
            });
          };

          return (
            <>
              <div
                className="fixed inset-0 bg-black/80 z-[70]"
                onClick={() => setIsFullscreen(false)}
              />
              <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
                <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                  {/* 좌우 이동 버튼 */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goPrev();
                        }}
                        className="absolute -left-20 text-white/85 hover:text-white bg-black/70 hover:bg-black/90 rounded-full w-14 h-14 flex items-center justify-center text-3xl shadow-xl border border-white/20"
                        aria-label="이전 이미지"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goNext();
                        }}
                        className="absolute -right-20 text-white/85 hover:text-white bg-black/70 hover:bg-black/90 rounded-full w-14 h-14 flex items-center justify-center text-3xl shadow-xl border border-white/20"
                        aria-label="다음 이미지"
                      >
                        ›
                      </button>
                    </>
                  )}

                  {/* 닫기 버튼 */}
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    className="absolute -top-8 right-0 text-white/80 hover:text-white"
                    aria-label="전체화면 닫기"
                  >
                    ✕
                  </button>

                  <div
                    className="bg-transparent rounded-lg overflow-hidden shadow-2xl"
                    style={{ maxWidth: '420px', maxHeight: '90vh' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ aspectRatio: '1024/1536' }} className="bg-transparent">
                      <img
                        src={current.url}
                        alt={current.label}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-white">
                      <span>{current.label}</span>
                      <span className="text-white/60">
                        ({safeIndex + 1}/{images.length})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
