'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Card {
  cardNumber: number;
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
  createdAt: string;
  updatedAt: string;
}

interface CardListResponse {
  success: boolean;
  total: number;
  cards: Card[];
}

export default function AdminPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isSlideOpen, setIsSlideOpen] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/api/v1/cards/list?limit=100');
      
      if (!response.ok) {
        throw new Error('카드 목록을 불러오는데 실패했습니다.');
      }
      
      const data: CardListResponse = await response.json();
      console.log('카드 목록 데이터:', data);
      console.log('첫 번째 카드 이미지 URL:', data.cards[0]?.generatedImageUrl || data.cards[0]?.characterImageUrl);
      setCards(data.cards);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      console.error('카드 목록 조회 오류:', err);
    } finally {
      setLoading(false);
    }
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

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setIsSlideOpen(true);
  };

  const handleCloseSlide = () => {
    setIsSlideOpen(false);
    // 애니메이션 완료 후 선택 해제
    setTimeout(() => {
      setSelectedCard(null);
    }, 300);
  };

  const getImageUrl = (url?: string) => {
    if (!url) {
      return null;
    }
    
    // base64 이미지인 경우
    if (url.startsWith('data:image/')) {
      return url;
    }
    
    // 이미 전체 URL인 경우
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // 상대 경로인 경우 처리
    let path = url.trim();
    
    // /data/upload로 시작하는 경우 그대로 사용
    if (path.startsWith('/data/upload/') || path.startsWith('/data/upload')) {
      // 이중 슬래시 제거
      path = path.replace(/\/+/g, '/');
      return `http://localhost:8000${path}`;
    }
    
    // /upload로 시작하는 경우 /data 추가
    if (path.startsWith('/upload/') || path.startsWith('/upload')) {
      path = `/data${path}`;
      path = path.replace(/\/+/g, '/'); // 이중 슬래시 제거
      return `http://localhost:8000${path}`;
    }
    
    // /로 시작하지 않으면 추가
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    
    // 그 외의 경우 /data/upload/ 추가
    path = `/data/upload${path}`;
    path = path.replace(/\/+/g, '/'); // 이중 슬래시 제거
    
    return `http://localhost:8000${path}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">카드 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">오류 발생</h3>
        </div>
        <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchCards}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            카드 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            총 {total}개의 카드가 등록되어 있습니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchCards}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            카드 생성
          </Link>
        </div>
      </div>

      {/* 카드 목록 */}
      {cards.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            등록된 카드가 없습니다.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            첫 번째 카드 만들기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {cards.map((card) => {
            const imageUrl = getImageUrl(
              card.generatedImageUrl || 
              card.characterImageUrl || 
              card.backgroundImageUrl
            );
            
            return (
              <div
                key={card.cardNumber}
                onClick={() => handleCardClick(card)}
                className="relative bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
                style={{
                  aspectRatio: '5/7', // 카드 비율 (400:560 = 5:7)
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={card.cardName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 이미지 로드 실패 시 fallback
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.image-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'image-fallback w-full h-full flex items-center justify-center text-gray-400 bg-gray-300 dark:bg-gray-600';
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
                {/* 카드 번호 표시 */}
                <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold backdrop-blur-sm">
                  #{card.cardNumber}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 오른쪽 슬라이드 패널 */}
      {selectedCard && (
        <>
          {/* 배경 오버레이 */}
          <div
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
              isSlideOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={handleCloseSlide}
          />

          {/* 슬라이드 패널 */}
          <div
            className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out m-0 ${
              isSlideOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="h-full flex flex-col overflow-y-auto">
              {/* 헤더 */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 pb-4 pt-0 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  카드 상세 정보
                </h2>
                <button
                  onClick={handleCloseSlide}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="닫기"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-400"
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

              {/* 컨텐츠 */}
              <div className="flex-1 p-6 space-y-6">
                {/* 카드 이미지 */}
                <div className="flex justify-center">
                  <div
                    className="relative bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg"
                    style={{
                      width: '400px',
                      aspectRatio: '5/7',
                    }}
                  >
                    {(() => {
                      const imageUrl = getImageUrl(
                        selectedCard.generatedImageUrl ||
                          selectedCard.characterImageUrl ||
                          selectedCard.backgroundImageUrl
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

                {/* 카드 정보 */}
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      기본 정보
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          카드 번호
                        </label>
                        <p className="text-base font-bold text-gray-900 dark:text-white">
                          #{selectedCard.cardNumber}
                        </p>
                      </div>
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

                  {/* 스탯 */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      스탯
                    </h3>
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

                  {/* 스킬 정보 */}
                  {(selectedCard.skill1Name || selectedCard.skill2Name) && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        스킬
                      </h3>
                      <div className="space-y-4">
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
                    </div>
                  )}

                  {/* 플레이버 텍스트 */}
                  {selectedCard.flavorText && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        설명
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                        "{selectedCard.flavorText}"
                      </p>
                    </div>
                  )}

                  {/* 메타데이터 */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      메타데이터
                    </h3>
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
          </div>
        </>
      )}
    </div>
  );
}
