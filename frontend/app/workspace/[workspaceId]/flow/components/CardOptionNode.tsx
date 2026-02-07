'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, type NodeProps, Position, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { getFlowCard, type FlowCard } from '@/app/lib/flow';
import type { CharacterBoxNodeData } from './CharacterBoxNode';

export type CardOptionNodeData = {
  flowCardId: number | null;
  // FlowCard 기반 (수정 불가)
  gender: string;
  attribute: string;
  type: string;
  // 사용자 입력 (수정 가능)
  cardName: string;
  rarity: string;
  attack: string;
  health: string;
  skill1Name: string;
  skill1Description: string;
  skill2Name: string;
  skill2Description: string;
  flavorText: string;
  cardNumber: string;
  series: string;
};

const inputClass =
  'w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30';
const selectClass =
  'w-full rounded-lg px-3 py-2 text-sm bg-[#2a2a32] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-white/30 appearance-none cursor-pointer';
const optionStyle = { backgroundColor: '#2a2a32', color: '#fff' };

function CardOptionNodeComponent({ data, id }: NodeProps<{ label?: string } & CardOptionNodeData>) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const [loading, setLoading] = useState(false);
  const [flowCard, setFlowCard] = useState<FlowCard | null>(null);

  // 이전 노드(CharacterBoxNode)에서 flowCardId 가져오기
  useEffect(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    if (incomingEdges.length === 0) {
      // 연결된 노드가 없으면 초기화
      if (data.flowCardId !== null) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    flowCardId: null,
                    gender: '',
                    attribute: '',
                    type: '',
                  } as CardOptionNodeData,
                }
              : n
          )
        );
      }
      return;
    }

    const sourceNodeId = incomingEdges[0].source;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode || sourceNode.type !== 'characterBox') return;

    const sourceData = sourceNode.data as CharacterBoxNodeData;
    const newFlowCardId = sourceData.flowCardId;

    // flowCardId가 변경되었을 때만 업데이트
    if (newFlowCardId !== data.flowCardId) {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  flowCardId: newFlowCardId,
                  gender: sourceData.gender || '',
                  attribute: sourceData.attribute || '',
                  type: sourceData.type || '',
                } as CardOptionNodeData,
              }
            : n
        )
      );
    }
  }, [edges, nodes, id, data.flowCardId, setNodes]);

  // FlowCard 데이터 로드
  useEffect(() => {
    if (!data.flowCardId) {
      setFlowCard(null);
      return;
    }

    setLoading(true);
    getFlowCard(data.flowCardId)
      .then((card) => {
        setFlowCard(card);
      })
      .catch(() => {
        setFlowCard(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [data.flowCardId]);

  const updateData = useCallback(
    (key: keyof CardOptionNodeData, value: string) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [key]: value } as CardOptionNodeData } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div className="rounded-xl min-w-[280px] max-w-[400px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/40" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">카드옵션 박스</span>
      </div>
      <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
        {loading && <div className="text-xs text-white/50">FlowCard 로드 중...</div>}

        {/* FlowCard 기반 기본 정보 (수정 불가) */}
        {data.flowCardId && (
          <div className="space-y-2 pb-3 border-b border-white/10">
            <div className="text-xs font-semibold text-white/90">기본 정보 (수정 불가)</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-white/60">성별:</span>
                <span className="ml-2 text-white/90">{data.gender || '-'}</span>
              </div>
              <div>
                <span className="text-white/60">속성:</span>
                <span className="ml-2 text-white/90">{data.attribute || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-white/60">클래스:</span>
                <span className="ml-2 text-white/90">{data.type || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {!data.flowCardId && (
          <div className="text-xs text-yellow-400/70 pb-3 border-b border-white/10">
            캐릭터 박스에서 FlowCard를 선택하세요.
          </div>
        )}

        {/* 카드명 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">카드명</label>
          <input
            type="text"
            value={data.cardName ?? ''}
            onChange={(e) => updateData('cardName', e.target.value)}
            className={inputClass}
            placeholder="카드명을 입력하세요"
          />
        </div>

        {/* 타입 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">타입</label>
          <input
            type="text"
            value={data.type ?? ''}
            disabled
            className={`${inputClass} opacity-60 cursor-not-allowed`}
            placeholder="클래스에서 자동 설정"
          />
        </div>

        {/* 속성 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">속성</label>
          <input
            type="text"
            value={data.attribute ?? ''}
            disabled
            className={`${inputClass} opacity-60 cursor-not-allowed`}
            placeholder="캐릭터 박스에서 자동 설정"
          />
        </div>

        {/* 등급 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">등급</label>
          <select
            value={data.rarity ?? ''}
            onChange={(e) => updateData('rarity', e.target.value)}
            className={selectClass}
          >
            <option value="" style={optionStyle}>등급 선택</option>
            <option value="⭐" style={optionStyle}>⭐ 노말</option>
            <option value="⭐⭐" style={optionStyle}>⭐⭐ 레어</option>
            <option value="⭐⭐⭐" style={optionStyle}>⭐⭐⭐ 에픽</option>
            <option value="⭐⭐⭐⭐" style={optionStyle}>⭐⭐⭐⭐ 레전드</option>
            <option value="⭐⭐⭐⭐⭐" style={optionStyle}>⭐⭐⭐⭐⭐ 신화</option>
          </select>
        </div>

        {/* 공격력 / 체력 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-white/70 mb-1">공격력</label>
            <input
              type="number"
              value={data.attack ?? ''}
              onChange={(e) => updateData('attack', e.target.value)}
              className={inputClass}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">체력</label>
            <input
              type="number"
              value={data.health ?? ''}
              onChange={(e) => updateData('health', e.target.value)}
              className={inputClass}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        {/* 카드 번호 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">카드 번호</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-white/50 pointer-events-none">#</span>
            <input
              type="text"
              value={(data.cardNumber ?? '').replace(/^#/, '')}
              onChange={(e) => {
                const value = e.target.value.replace(/^#+/, '').replace(/[^0-9]/g, '');
                updateData('cardNumber', value ? `#${value}` : '');
              }}
              className={`${inputClass} pl-6`}
              placeholder="001"
            />
          </div>
        </div>

        {/* 시리즈 */}
        <div>
          <label className="block text-xs text-white/70 mb-1">시리즈/제작자</label>
          <input
            type="text"
            value={data.series ?? ''}
            onChange={(e) => updateData('series', e.target.value)}
            className={inputClass}
            placeholder="시리즈명 또는 제작자명"
          />
        </div>

        {/* 스킬 1 */}
        <div className="border-t border-white/10 pt-3">
          <div className="text-xs font-semibold text-white/90 mb-2">스킬 1</div>
          <div className="space-y-2">
            <input
              type="text"
              value={data.skill1Name ?? ''}
              onChange={(e) => updateData('skill1Name', e.target.value)}
              className={inputClass}
              placeholder="스킬명"
            />
            <textarea
              value={data.skill1Description ?? ''}
              onChange={(e) => updateData('skill1Description', e.target.value)}
              className={`${inputClass} resize-y min-h-[60px]`}
              placeholder="효과 설명"
              rows={2}
            />
          </div>
        </div>

        {/* 스킬 2 */}
        <div className="border-t border-white/10 pt-3">
          <div className="text-xs font-semibold text-white/90 mb-2">스킬 2</div>
          <div className="space-y-2">
            <input
              type="text"
              value={data.skill2Name ?? ''}
              onChange={(e) => updateData('skill2Name', e.target.value)}
              className={inputClass}
              placeholder="스킬명"
            />
            <textarea
              value={data.skill2Description ?? ''}
              onChange={(e) => updateData('skill2Description', e.target.value)}
              className={`${inputClass} resize-y min-h-[60px]`}
              placeholder="효과 설명"
              rows={2}
            />
          </div>
        </div>

        {/* 플레이버 텍스트 */}
        <div className="border-t border-white/10 pt-3">
          <label className="block text-xs text-white/70 mb-1">설명/플레이버 텍스트</label>
          <textarea
            value={data.flavorText ?? ''}
            onChange={(e) => updateData('flavorText', e.target.value)}
            className={`${inputClass} resize-y min-h-[80px]`}
            placeholder="카드의 배경 스토리나 캐릭터 설명을 입력하세요"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

export const CardOptionNode = memo(CardOptionNodeComponent);
