'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useCategoryOptions } from '../context/CategoryOptionsContext';
import { listFlowCharacters, listFlowCards, type FlowCharacter } from '@/app/lib/flow';

export type CharacterBoxNodeData = {
  characterId: number | null;
  gender: string;
  attribute: string;
  type: string; // "부모 · 하위" 형식
  flowCardId: number | null;
};

const selectClass =
  'w-full rounded-lg px-3 py-2 text-sm bg-[#2a2a32] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-white/30 appearance-none cursor-pointer';
const optionStyle = { backgroundColor: '#2a2a32', color: '#fff' };

function CharacterBoxNodeComponent({ data, id }: NodeProps<{ label?: string } & CharacterBoxNodeData>) {
  const { setNodes } = useReactFlow();
  const options = useCategoryOptions();
  const [characters, setCharacters] = useState<FlowCharacter[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFlowCard, setLoadingFlowCard] = useState(false);

  const genderList = options.gender ?? [];
  const attributeList = options.attribute ?? [];
  const classTree = options.classTree ?? [];

  // 클래스 옵션 생성 (2뎁스만)
  const classOptions: { value: string; label: string }[] = [];
  classTree.forEach((two) => {
    (two.children ?? []).forEach((three) => {
      const value = `${two.name} · ${three.name}`;
      classOptions.push({ value, label: value });
    });
  });

  // 캐릭터 목록 로드
  useEffect(() => {
    setLoading(true);
    listFlowCharacters()
      .then((res) => {
        setCharacters(res.characters);
      })
      .catch(() => {
        setCharacters([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // FlowCard 조회
  useEffect(() => {
    if (!data.characterId || !data.gender || !data.attribute || !data.type) {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, flowCardId: null } as CharacterBoxNodeData } : n
        )
      );
      return;
    }

    setLoadingFlowCard(true);
    listFlowCards({
      characterId: data.characterId,
      gender: data.gender,
      attribute: data.attribute,
      type: data.type,
    })
      .then((res) => {
        const flowCard = res.cards?.[0];
        if (flowCard) {
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, flowCardId: flowCard.id } as CharacterBoxNodeData } : n
            )
          );
        } else {
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, flowCardId: null } as CharacterBoxNodeData } : n
            )
          );
        }
      })
      .catch(() => {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, flowCardId: null } as CharacterBoxNodeData } : n
          )
        );
      })
      .finally(() => {
        setLoadingFlowCard(false);
      });
  }, [data.characterId, data.gender, data.attribute, data.type, id, setNodes]);

  const updateData = useCallback(
    (key: keyof CharacterBoxNodeData, value: string | number | null) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [key]: value } as CharacterBoxNodeData } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div className="rounded-xl min-w-[240px] max-w-[320px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">캐릭터 박스</span>
      </div>
      <div className="p-3 space-y-3">
        {/* 캐릭터 선택 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">캐릭터</label>
          <select
            value={data.characterId ?? ''}
            onChange={(e) => updateData('characterId', e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
            disabled={loading}
            aria-label="캐릭터 선택"
          >
            <option value="" style={optionStyle}>선택</option>
            {characters.map((char) => (
              <option key={char.id} value={char.id} style={optionStyle}>
                {char.name}
              </option>
            ))}
          </select>
        </div>

        {/* 성별 선택 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">성별</label>
          <select
            value={data.gender ?? ''}
            onChange={(e) => updateData('gender', e.target.value)}
            className={selectClass}
            aria-label="성별 선택"
          >
            <option value="" style={optionStyle}>선택</option>
            {genderList.map((label) => (
              <option key={label} value={label} style={optionStyle}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 속성 선택 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">속성</label>
          <select
            value={data.attribute ?? ''}
            onChange={(e) => updateData('attribute', e.target.value)}
            className={selectClass}
            aria-label="속성 선택"
          >
            <option value="" style={optionStyle}>선택</option>
            {attributeList.map((label) => (
              <option key={label} value={label} style={optionStyle}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 클래스 선택 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">클래스</label>
          <select
            value={data.type ?? ''}
            onChange={(e) => updateData('type', e.target.value)}
            className={selectClass}
            aria-label="클래스 선택"
          >
            <option value="" style={optionStyle}>선택</option>
            {classOptions.map(({ value, label }) => (
              <option key={value} value={value} style={optionStyle}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* FlowCard ID 표시 */}
        {loadingFlowCard && (
          <div className="text-xs text-white/50">FlowCard 조회 중...</div>
        )}
        {!loadingFlowCard && data.flowCardId && (
          <div className="text-xs text-white/70">
            FlowCard ID: {data.flowCardId}
          </div>
        )}
        {!loadingFlowCard && !data.flowCardId && data.characterId && data.gender && data.attribute && data.type && (
          <div className="text-xs text-yellow-400/70">
            해당 조합의 FlowCard를 찾을 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

export const CharacterBoxNode = memo(CharacterBoxNodeComponent);
