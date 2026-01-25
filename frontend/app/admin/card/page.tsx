'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiClipboard, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { buildPrompt } from '../../lib/promptBuilder';
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
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; card: Card | null }>({
    isOpen: false,
    card: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setIsSlideOpen(true);
  };

  const handleCloseSlide = () => {
    setIsSlideOpen(false);
    setTimeout(() => {
      setSelectedCard(null);
    }, 300);
  };

  const handleEditCard = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    // TODO: 수정 기능 구현
    console.log('수정:', card);
  };

  const handleDeleteCard = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    setDeleteModal({ isOpen: true, card });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.card) return;

    const card = deleteModal.card;

    try {
      setIsDeleting(true);
      const response = await fetch(`http://localhost:8000/api/v1/cards/${card.cardSn}`, {
        method: 'DELETE',
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
    } catch (err) {
      alert(err instanceof Error ? err.message : '카드 삭제 중 오류가 발생했습니다.');
      // 에러 발생 시 모달은 유지
    } finally {
      setIsDeleting(false);
    }
  };

  const actionBar = (
    <div className="flex justify-end gap-2">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const imageUrl = getImageUrl(
            card.generatedImageUrl || card.characterImageUrl || card.backgroundImageUrl,
          );

          return (
            <div key={card.cardSn} className="group relative">
              <div
                onClick={() => handleCardClick(card)}
                className="bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
                style={{ aspectRatio: '5/7' }}
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
              
              {/* Hover 시 카드 외부 하단에 나타나는 조작 버튼 */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 flex justify-center gap-2 pt-2 opacity-0 group-hover:opacity-100 translate-y-0 group-hover:translate-y-2 transition-all duration-300 ease-out">
                <button
                  onClick={(e) => handleEditCard(e, card)}
                  className="h-8 w-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center shadow-lg transition-colors"
                  aria-label="카드 수정"
                  title="카드 수정"
                >
                  <FiEdit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteCard(e, card)}
                  className="h-8 w-8 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-lg transition-colors"
                  aria-label="카드 삭제"
                  title="카드 삭제"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
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

              <div className="flex-1 p-4 space-y-4">
                <div className="flex justify-center">
                  <div
                    className="relative bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg"
                    style={{ width: '360px', aspectRatio: '5/7' }}
                  >
                    {(() => {
                      const imageUrl = getImageUrl(
                        selectedCard.generatedImageUrl ||
                          selectedCard.characterImageUrl ||
                          selectedCard.backgroundImageUrl,
                      );
                      if (imageUrl) {
                        return (
                          <img
                            src={imageUrl}
                            alt={selectedCard.cardName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.image-fallback')) {
                                const fallback = document.createElement('div');
                                fallback.className =
                                  'image-fallback w-full h-full flex items-center justify-center text-gray-400 bg-gray-300 dark:bg-gray-600';
                                fallback.innerHTML = '<span class="text-6xl">🎴</span>';
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        );
                      }

                      return (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-300 dark:bg-gray-600">
                          <span className="text-6xl">🎴</span>
                        </div>
                      );
                    })()}
                  </div>
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
    </div>
  );
}
