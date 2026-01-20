'use client';

import React, { useState } from 'react';

interface ResultPanelProps {
  prompt: string;
}

export default function ResultPanel({ prompt }: ResultPanelProps) {
  const [copied, setCopied] = useState(false);

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
            onClick={copyToClipboard}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              copied
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                복사됨!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                클립보드 복사
              </>
            )}
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 border border-gray-200 dark:border-gray-700">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {prompt}
          </pre>
        </div>
      </div>
    </div>
  );
}
