'use client';

import React from 'react';

export type Step = 'image' | 'info';

interface StepTabsProps {
  currentStep: Step;
  onStepChange: (step: Step) => void;
  steps: {
    image: { completed: boolean; enabled: boolean };
    info: { completed: boolean; enabled: boolean };
  };
}

export default function StepTabs({ currentStep, onStepChange, steps }: StepTabsProps) {
  const stepConfig = [
    {
      id: 'image' as Step,
      label: '이미지',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'info' as Step,
      label: '정보',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {stepConfig.map((step, index) => {
        const stepState = steps[step.id];
        const isActive = currentStep === step.id;
        const isEnabled = stepState.enabled;
        const isCompleted = stepState.completed;

        return (
          <button
            key={step.id}
            onClick={() => isEnabled && onStepChange(step.id)}
            disabled={!isEnabled}
            className={`
              relative flex flex-col items-center justify-center
              w-16 h-20 p-3 rounded-lg
              transition-all duration-200
              ${
                isActive
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : isEnabled
                  ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-2 border-gray-200 dark:border-gray-800 cursor-not-allowed'
              }
              ${isEnabled && !isActive ? 'hover:scale-102' : ''}
            `}
            title={step.label}
          >
            {/* 완료 체크 표시 */}
            {isCompleted && !isActive && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* 아이콘 */}
            <div className={`mb-1 ${isActive ? 'text-white' : ''}`}>{step.icon}</div>

            {/* 라벨 */}
            <span className="text-xs font-medium">{step.label}</span>

            {/* 단계 번호 */}
            <div
              className={`
                absolute -bottom-1 left-1/2 transform -translate-x-1/2
                w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                ${
                  isActive
                    ? 'bg-white text-blue-500'
                    : isEnabled
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                }
              `}
            >
              {index + 1}
            </div>
          </button>
        );
      })}
    </div>
  );
}
