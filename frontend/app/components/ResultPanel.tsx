'use client';

import React, { useState } from 'react';
import CardPreview from './CardPreview';

interface CardData {
  characterImage?: string;
  backgroundImage?: string;
  cardName?: string;
  type?: string;
  attribute?: string;
  rarity?: string;
  attack?: string;
  health?: string;
  skill1?: {
    name: string;
    description: string;
  };
  skill2?: {
    name: string;
    description: string;
  };
  flavorText?: string;
  cardNumber?: string;
  series?: string;
}

interface ResultPanelProps {
  prompt: string;
  previewImageUrl?: string;
  cardData: CardData;
}

export default function ResultPanel({ prompt, previewImageUrl, cardData }: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      // 대체 방법: 텍스트 영역을 생성하여 복사
      const textArea = document.createElement('textarea');
      textArea.value = prompt;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('대체 복사 방법도 실패:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const downloadPreviewImage = () => {
    if (!previewImageUrl) return;

    // data URL 형태도 대응하기 위해 fetch 사용
    fetch(previewImageUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'card-preview.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error('미리보기 이미지 다운로드 실패:', err);
        // 실패 시 data URL 그대로 다운로드 시도
        const link = document.createElement('a');
        link.href = previewImageUrl;
        link.download = 'card-preview.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  };

  const handleOpenPreviewModal = () => {
    if (!previewImageUrl) return;
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          생성 결과
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          이미지 생성 모델에 전달할 프롬프트와 미리보기 이미지입니다.
        </p>
      </div>

      {/* 프롬프트 영역 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            이미지 생성 프롬프트
          </h3>
          <div className="flex items-center gap-2">
            {/* 프롬프트 클립보드 복사 아이콘 버튼 */}
            <button
              onClick={copyToClipboard}
              aria-label="프롬프트 클립보드 복사"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                copied
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>

            {/* 실시간 미리보기 카드 다운로드 아이콘 버튼 (모달 오픈) */}
            {previewImageUrl && (
              <button
                onClick={handleOpenPreviewModal}
                aria-label="실시간 미리보기 카드 미리보기 및 다운로드"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 border border-gray-200 dark:border-gray-700">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {prompt}
          </pre>
        </div>
      </div>

      {/* 카드 이미지 다운로드 전 미리보기 모달 */}
      {isModalOpen && previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 rounded-xl shadow-2xl p-4 w-full max-w-[460px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">다운로드 미리보기</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="미리보기 닫기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-3 flex justify-center mb-4">
              {/* 실제 다운로드될 레이아웃과 동일한 카드 컴포넌트 미리보기 */}
              <div className="relative" style={{ width: '400px', aspectRatio: '1024/1536' }}>
                <CardPreview cardData={cardData} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition-colors text-sm"
              >
                닫기
              </button>
              <button
                onClick={downloadPreviewImage}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
