'use client';

import React, { useState } from 'react';

interface DistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { attributeStartGender: string; classStartGender: string }) => void;
}

const genderOptions: string[] = ['남', '여'];

export default function DistributionModal({
  isOpen,
  onClose,
  onConfirm,
}: DistributionModalProps) {
  const [attributeGender, setAttributeGender] = useState<string>('남');
  const [classGender, setClassGender] = useState<string>('여');

  const handleExecute = () => {
    onConfirm({
      attributeStartGender: attributeGender,
      classStartGender: classGender,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[70]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl border border-white/15 bg-[#05050b] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
            <h2 className="text-sm font-semibold text-white">자동 배분 설정</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="닫기"
            >
              ×
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-white/70">속성 배분 기준</div>
              <div className="text-[11px] text-white/40 mb-1">
                남 &gt; 여 &gt; 남 &gt; 여 순으로 10개의 속성을 배분합니다.
              </div>
              <div className="flex gap-3">
                {genderOptions.map((g) => (
                  <label
                    key={`attr-${g}`}
                    className="flex items-center gap-2 text-xs text-white/80 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="attr-gender"
                      value={g}
                      checked={attributeGender === g}
                      onChange={() => setAttributeGender(g)}
                      className="rounded-full border-white/40 text-indigo-400 focus:ring-white/30"
                    />
                    <span>{g} 기준 시작</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="space-y-2">
              <div className="text-xs font-medium text-white/70">클래스 배분 기준</div>
              <div className="text-[11px] text-white/40 mb-1">
                여 &gt; 남 &gt; 여 &gt; 남 순으로 10개의 클래스를 배분합니다.
              </div>
              <div className="flex gap-3">
                {genderOptions.map((g) => (
                  <label
                    key={`class-${g}`}
                    className="flex items-center gap-2 text-xs text-white/80 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="class-gender"
                      value={g}
                      checked={classGender === g}
                      onChange={() => setClassGender(g)}
                      className="rounded-full border-white/40 text-indigo-400 focus:ring-white/30"
                    />
                    <span>{g} 기준 시작</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecute}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              실행
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

