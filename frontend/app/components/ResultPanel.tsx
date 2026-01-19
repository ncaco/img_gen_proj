'use client';

import React from 'react';

interface ResultPanelProps {
  prompt: string;
  previewImageUrl?: string;
}

export default function ResultPanel({ prompt, previewImageUrl }: ResultPanelProps) {
  const downloadPrompt = () => {
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card-prompt.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadImage = () => {
    if (!previewImageUrl) return;
    
    // data URL을 blob으로 변환
    fetch(previewImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'card-preview.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('이미지 다운로드 실패:', err);
        // data URL이면 직접 다운로드
        const link = document.createElement('a');
        link.href = previewImageUrl;
        link.download = 'card-preview.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
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
          <button
            onClick={downloadPrompt}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            다운로드
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 border border-gray-200 dark:border-gray-700">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {prompt}
          </pre>
        </div>
      </div>

      {/* 미리보기 이미지 영역 */}
      {previewImageUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              카드 미리보기 이미지
            </h3>
            <button
              onClick={downloadImage}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              다운로드
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 border border-gray-200 dark:border-gray-700 flex justify-center">
            <div className="relative" style={{ width: '400px', height: '560px' }}>
              <img
                src={previewImageUrl}
                alt="카드 미리보기"
                className="w-full h-full object-contain rounded-lg shadow-2xl border-2 border-gray-300"
                style={{ width: '400px', height: '560px', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
