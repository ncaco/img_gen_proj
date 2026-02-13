'use client';

import React, { useEffect, useState } from 'react';
import { listFlowCharacters, type FlowCharacter, fetchLoreMapping } from '@/app/lib/flow';

interface HeroSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (character: FlowCharacter) => void;
}

export default function HeroSelectModal({ isOpen, onClose, onSelect }: HeroSelectModalProps) {
  const [characters, setCharacters] = useState<FlowCharacter[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoadingList(true);
    setError(null);
    listFlowCharacters()
      .then((res) => {
        setCharacters(res.characters ?? []);
      })
      .catch(() => {
        setCharacters([]);
        setError('캐릭터 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        setLoadingList(false);
      });
  }, [isOpen]);

  const handleSelect = (char: FlowCharacter) => {
    onSelect(char);
    onClose();
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError('영웅 이름을 입력해 주세요.');
      return;
    }
    try {
      setCreating(true);
      setError(null);
      // 세계관 분석 API를 사용하여 FlowCharacter 생성 (flowId는 생략)
      const result = await fetchLoreMapping({
        name: newName.trim(),
        description: newDescription.trim(),
      });
      const createdId = result.characterId;

      // 목록 재조회 후 방금 만든 캐릭터를 자동 선택
      const listRes = await listFlowCharacters();
      setCharacters(listRes.characters ?? []);
      const created = listRes.characters.find((c) => c.id === createdId);
      if (created) {
        onSelect(created);
        onClose();
      } else {
        setError('새 영웅이 생성되었지만 목록에서 찾을 수 없습니다.');
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '영웅 생성 중 오류가 발생했습니다.',
      );
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/70 z-[70]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 모달 */}
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0b0b10] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
            <h2 className="text-sm font-semibold text-white">영웅 선택</h2>
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
            {/* 기존 영웅 목록 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/70">기존 영웅</span>
                {loadingList && (
                  <span className="text-[11px] text-white/40">불러오는 중...</span>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-black/20">
                {characters.length === 0 ? (
                  <div className="py-6 text-center text-xs text-white/50">
                    등록된 영웅이 없습니다.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {characters.map((char) => (
                      <li key={char.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(char)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition-colors"
                        >
                          <span className="truncate">{char.name}</span>
                          <span className="ml-2 text-[10px] text-white/40">
                            ID: {char.id}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 구분선 */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* 새 영웅 추가 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/70">새 영웅 추가</span>
                {creating && (
                  <span className="text-[11px] text-white/40">생성 중...</span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="영웅 이름"
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="간단한 설명 (선택)"
                  rows={3}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 resize-none"
                />
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                새 영웅 생성 및 선택
              </button>
            </div>

            {error && (
              <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

