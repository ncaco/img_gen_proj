'use client';

import { memo, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Handle, type NodeProps, Position, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { getFlowCard, getFlowCharacter, generateCardData, generateNoblePhantasm, generateFlavorText, type FlowCard } from '@/app/lib/flow';
import type { CharacterBoxNodeData } from './CharacterBoxNode';
import { isNodeConnectedToConfirmedCard } from '../utils/cardConfirm';

export type CardOptionNodeData = {
  flowCardId: number | null;
  characterId: number | null; // CharacterBoxNode에서 전달
  // FlowCard 기반 (수정 불가)
  gender: string;
  attribute: string;
  type: string;
  // 사용자 입력 (수정 가능)
  cardName: string;
  rarity: string;
  attack: string;
  health: string;
  noblePhantasm1Name: string;
  noblePhantasm1TrueName: string;
  noblePhantasm2Name: string;
  noblePhantasm2TrueName: string;
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
  const [characterName, setCharacterName] = useState<string>('');
  const prevSourceDataRef = useRef<string>('');
  const [generatingCardData, setGeneratingCardData] = useState(false);
  const [generatingNoblePhantasm1, setGeneratingNoblePhantasm1] = useState(false);
  const [generatingNoblePhantasm2, setGeneratingNoblePhantasm2] = useState(false);
  const [generatingFlavorText, setGeneratingFlavorText] = useState(false);
  
  // 카드 확정 상태 확인
  const isConfirmed = isNodeConnectedToConfirmedCard(id, nodes, edges);
  
  // 연결된 캐릭터 박스의 모든 정보가 선택되었는지 확인
  const isCharacterBoxComplete = useMemo(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    if (incomingEdges.length === 0) return false;
    
    const sourceNodeId = incomingEdges[0].source;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode || sourceNode.type !== 'characterBox') return false;
    
    const sourceData = sourceNode.data as CharacterBoxNodeData;
    return !!(
      sourceData.characterId &&
      sourceData.gender &&
      sourceData.attribute &&
      sourceData.type
    );
  }, [edges, nodes, id]);

  // 이전 노드(CharacterBoxNode)에서 flowCardId 가져오기
  useEffect(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    if (incomingEdges.length === 0) {
      // 연결된 노드가 없으면 초기화
      if (data.flowCardId !== null || data.characterId !== null) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    flowCardId: null,
                    characterId: null,
                    gender: '',
                    attribute: '',
                    type: '',
                    cardName: '', // 카드명도 초기화
                  } as CardOptionNodeData,
                }
              : n
          )
        );
      }
      prevSourceDataRef.current = '';
      return;
    }

    const sourceNodeId = incomingEdges[0].source;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode || sourceNode.type !== 'characterBox') return;

    const sourceData = sourceNode.data as CharacterBoxNodeData;
    
    // 소스 데이터의 변경 여부 확인
    const currentSourceDataStr = JSON.stringify({
      flowCardId: sourceData.flowCardId,
      characterId: sourceData.characterId,
      gender: sourceData.gender,
      attribute: sourceData.attribute,
      type: sourceData.type,
    });

    // 데이터가 변경되지 않았으면 업데이트하지 않음
    if (prevSourceDataRef.current === currentSourceDataStr) {
      return;
    }

    prevSourceDataRef.current = currentSourceDataStr;

    // "부모 · 하위" 형식에서 2뎁스 클래스(하위)만 추출
    const typeParts = sourceData.type.split(' · ');
    const typeVal = typeParts.length > 1 ? typeParts[1] : sourceData.type;

    // flowCardId가 변경되었을 때만 업데이트
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                flowCardId: sourceData.flowCardId,
                characterId: sourceData.characterId,
                gender: sourceData.gender || '',
                attribute: sourceData.attribute || '',
                type: typeVal || '',
                // 카드명은 나중에 캐릭터 이름으로 설정됨
              } as CardOptionNodeData,
            }
          : n
      )
    );
  }, [edges, nodes, id, setNodes]);

  // 캐릭터 이름 로드 및 카드명 자동 할당
  useEffect(() => {
    if (!data.characterId) {
      setCharacterName('');
      if (data.cardName) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, cardName: '' } as CardOptionNodeData } : n
          )
        );
      }
      return;
    }

    getFlowCharacter(data.characterId)
      .then((character) => {
        setCharacterName(character.name);
        // 카드명에 캐릭터 이름 자동 할당
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, cardName: character.name } as CardOptionNodeData } : n
          )
        );
      })
      .catch(() => {
        setCharacterName('');
      });
  }, [data.characterId, id, setNodes]);

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

  // 보구 1 생성
  const handleGenerateNoblePhantasm1 = useCallback(async () => {
    if (!data.characterId || !data.gender || !data.attribute || !data.type) {
      alert('캐릭터 정보가 필요합니다.');
      return;
    }

    setGeneratingNoblePhantasm1(true);
    try {
      // 기존 보구 목록 수집
      // 주의: noblePhantasm1Name에는 보구명이, noblePhantasm1TrueName에는 진명개방이 저장됨
      const excludeList: Array<{ 보구명: string; 진명개방: string }> = [];
      
      // 보구1이 있으면 제외 목록에 추가
      if (data.noblePhantasm1Name) {
        excludeList.push({
          보구명: data.noblePhantasm1Name, // 보구명은 Name 필드에 있음
          진명개방: data.noblePhantasm1TrueName || '', // 진명개방은 TrueName 필드에 있음
        });
      }
      
      // 보구2가 있으면 제외 목록에 추가
      if (data.noblePhantasm2Name) {
        excludeList.push({
          보구명: data.noblePhantasm2Name, // 보구명은 Name 필드에 있음
          진명개방: data.noblePhantasm2TrueName || '', // 진명개방은 TrueName 필드에 있음
        });
      }

      const result = await generateNoblePhantasm({
        characterId: data.characterId,
        gender: data.gender,
        attribute: data.attribute,
        type: data.type,
        excludeNoblePhantasms: excludeList.length > 0 ? excludeList : undefined,
      });

      // 보구명을 보구명 필드에, 진명개방을 보구설명(진명개방) 필드에 할당
      updateData('noblePhantasm1Name', result.보구명);
      updateData('noblePhantasm1TrueName', result.진명개방);
    } catch (error) {
      alert(error instanceof Error ? error.message : '보구 생성에 실패했습니다.');
    } finally {
      setGeneratingNoblePhantasm1(false);
    }
  }, [data.characterId, data.gender, data.attribute, data.type, data.noblePhantasm1Name, data.noblePhantasm1TrueName, data.noblePhantasm2Name, data.noblePhantasm2TrueName, updateData]);

  // 보구 2 생성
  const handleGenerateNoblePhantasm2 = useCallback(async () => {
    if (!data.characterId || !data.gender || !data.attribute || !data.type) {
      alert('캐릭터 정보가 필요합니다.');
      return;
    }

    setGeneratingNoblePhantasm2(true);
    try {
      // 기존 보구 목록 수집
      // 주의: noblePhantasm1Name에는 보구명이, noblePhantasm1TrueName에는 진명개방이 저장됨
      const excludeList: Array<{ 보구명: string; 진명개방: string }> = [];
      
      // 보구1이 있으면 제외 목록에 추가
      if (data.noblePhantasm1Name) {
        excludeList.push({
          보구명: data.noblePhantasm1Name, // 보구명은 Name 필드에 있음
          진명개방: data.noblePhantasm1TrueName || '', // 진명개방은 TrueName 필드에 있음
        });
      }
      
      // 보구2가 있으면 제외 목록에 추가
      if (data.noblePhantasm2Name) {
        excludeList.push({
          보구명: data.noblePhantasm2Name, // 보구명은 Name 필드에 있음
          진명개방: data.noblePhantasm2TrueName || '', // 진명개방은 TrueName 필드에 있음
        });
      }

      const result = await generateNoblePhantasm({
        characterId: data.characterId,
        gender: data.gender,
        attribute: data.attribute,
        type: data.type,
        excludeNoblePhantasms: excludeList.length > 0 ? excludeList : undefined,
      });

      // 보구명을 보구명 필드에, 진명개방을 보구설명(진명개방) 필드에 할당
      updateData('noblePhantasm2Name', result.보구명);
      updateData('noblePhantasm2TrueName', result.진명개방);
    } catch (error) {
      alert(error instanceof Error ? error.message : '보구 생성에 실패했습니다.');
    } finally {
      setGeneratingNoblePhantasm2(false);
    }
  }, [data.characterId, data.gender, data.attribute, data.type, data.noblePhantasm1Name, data.noblePhantasm1TrueName, data.noblePhantasm2Name, data.noblePhantasm2TrueName, updateData]);

  // 플레이버 텍스트 생성
  const handleGenerateFlavorText = useCallback(async () => {
    if (!data.characterId || !data.gender || !data.attribute || !data.type) {
      alert('캐릭터 정보가 필요합니다.');
      return;
    }

    setGeneratingFlavorText(true);
    try {
      const result = await generateFlavorText({
        characterId: data.characterId,
        gender: data.gender,
        attribute: data.attribute,
        type: data.type,
      });

      updateData('flavorText', result.flavorText);
    } catch (error) {
      alert(error instanceof Error ? error.message : '플레이버 텍스트 생성에 실패했습니다.');
    } finally {
      setGeneratingFlavorText(false);
    }
  }, [data.characterId, data.gender, data.attribute, data.type, updateData]);

  // 카드 데이터 일괄 생성 (보구1, 보구2, 플레이버 텍스트)
  const handleGenerateCardData = useCallback(async () => {
    if (!data.characterId || !data.gender || !data.attribute || !data.type) {
      alert('캐릭터 정보가 필요합니다.');
      return;
    }

    setGeneratingCardData(true);
    try {
      // 기존 보구 목록 수집
      // 주의: noblePhantasm1Name에는 보구명이, noblePhantasm1TrueName에는 진명개방이 저장됨
      const excludeList: Array<{ 보구명: string; 진명개방: string }> = [];
      
      // 보구1이 있으면 제외 목록에 추가
      if (data.noblePhantasm1Name) {
        excludeList.push({
          보구명: data.noblePhantasm1Name, // 보구명은 Name 필드에 있음
          진명개방: data.noblePhantasm1TrueName || '', // 진명개방은 TrueName 필드에 있음
        });
      }
      
      // 보구2가 있으면 제외 목록에 추가
      if (data.noblePhantasm2Name) {
        excludeList.push({
          보구명: data.noblePhantasm2Name, // 보구명은 Name 필드에 있음
          진명개방: data.noblePhantasm2TrueName || '', // 진명개방은 TrueName 필드에 있음
        });
      }

      const result = await generateCardData({
        characterId: data.characterId,
        gender: data.gender,
        attribute: data.attribute,
        type: data.type,
        excludeNoblePhantasms: excludeList.length > 0 ? excludeList : undefined,
      });

      // 보구명을 보구명 필드에, 진명개방을 보구설명(진명개방) 필드에 할당
      updateData('noblePhantasm1Name', result.noblePhantasm1.보구명);
      updateData('noblePhantasm1TrueName', result.noblePhantasm1.진명개방);
      updateData('noblePhantasm2Name', result.noblePhantasm2.보구명);
      updateData('noblePhantasm2TrueName', result.noblePhantasm2.진명개방);
      updateData('flavorText', result.flavorText);
    } catch (error) {
      alert(error instanceof Error ? error.message : '카드 데이터 생성에 실패했습니다.');
    } finally {
      setGeneratingCardData(false);
    }
  }, [data.characterId, data.gender, data.attribute, data.type, data.noblePhantasm1Name, data.noblePhantasm1TrueName, data.noblePhantasm2Name, data.noblePhantasm2TrueName, updateData]);

  return (
    <div className="rounded-xl min-w-[280px] max-w-[400px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">카드옵션 박스</span>
      </div>
      <div className="p-3 space-y-3">
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
                <span className="ml-2 text-white/90">
                  {data.type
                    ? data.type.includes(' · ')
                      ? data.type.split(' · ')[1]
                      : data.type
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        )}

        {!data.flowCardId && (
          <div className="text-xs text-yellow-400/70 pb-3 border-b border-white/10">
            {!isCharacterBoxComplete 
              ? '캐릭터 박스에서 모든 정보(캐릭터, 성별, 속성, 클래스)를 선택하세요.'
              : '캐릭터 박스에서 FlowCard를 선택하세요.'}
          </div>
        )}

        {/* 카드명 / 타입 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-white/70 mb-1">카드명</label>
            <input
              type="text"
              value={data.cardName ?? ''}
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
              placeholder="캐릭터 이름에서 자동 설정"
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">타입</label>
            <input
              type="text"
              value={
                data.type
                  ? data.type.includes(' · ')
                    ? data.type.split(' · ')[1]
                    : data.type
                  : ''
              }
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
              placeholder="클래스에서 자동 설정"
            />
          </div>
        </div>

        {/* 속성 / 등급 */}
        <div className="grid grid-cols-2 gap-2">
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
          <div>
            <label className="block text-xs text-white/70 mb-1">등급</label>
            <select
              value={data.rarity ?? ''}
              onChange={(e) => updateData('rarity', e.target.value)}
              disabled={isConfirmed || !isCharacterBoxComplete}
              className={`${selectClass} ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="" style={optionStyle}>등급 선택</option>
              <option value="⭐" style={optionStyle}>⭐ 노말</option>
              <option value="⭐⭐" style={optionStyle}>⭐⭐ 레어</option>
              <option value="⭐⭐⭐" style={optionStyle}>⭐⭐⭐ 에픽</option>
              <option value="⭐⭐⭐⭐" style={optionStyle}>⭐⭐⭐⭐ 레전드</option>
              <option value="⭐⭐⭐⭐⭐" style={optionStyle}>⭐⭐⭐⭐⭐ 신화</option>
            </select>
          </div>
        </div>

        {/* 공격력 / 체력 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-white/70 mb-1">공격력</label>
            <input
              type="number"
              value={data.attack ?? ''}
              onChange={(e) => updateData('attack', e.target.value)}
              disabled={isConfirmed || !isCharacterBoxComplete}
              className={`${inputClass} ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              disabled={isConfirmed || !isCharacterBoxComplete}
              className={`${inputClass} ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        {/* 카드 번호 / 시리즈 */}
        <div className="grid grid-cols-2 gap-2">
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
                disabled={isConfirmed || !isCharacterBoxComplete}
                className={`${inputClass} pl-6 ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="001"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">시리즈/제작자</label>
            <input
              type="text"
              value={data.series ?? ''}
              onChange={(e) => updateData('series', e.target.value)}
              disabled={isConfirmed || !isCharacterBoxComplete}
              className={`${inputClass} ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="시리즈명 또는 제작자명"
            />
          </div>
        </div>

        {/* 보구 1 */}
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-white/90">보구 1</div>
            <button
              onClick={handleGenerateNoblePhantasm1}
              disabled={isConfirmed || generatingNoblePhantasm1 || !data.characterId || !isCharacterBoxComplete}
              className="text-yellow-400 hover:text-yellow-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              title="보구 자동 생성"
            >
              {generatingNoblePhantasm1 ? (
                <span className="text-xs">생성 중...</span>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={data.noblePhantasm1Name ?? ''}
              onChange={(e) => updateData('noblePhantasm1Name', e.target.value)}
              disabled={isConfirmed || !isCharacterBoxComplete}
              className={`${inputClass} ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="보구명"
            />
            <textarea
              value={data.noblePhantasm1TrueName ?? ''}
              onChange={(e) => updateData('noblePhantasm1TrueName', e.target.value)}
              disabled={isConfirmed || !isCharacterBoxComplete}
              className={`${inputClass} resize-y min-h-[60px] ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="진명개방"
              rows={2}
            />
          </div>
        </div>

        {/* 보구 2 */}
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-white/90">보구 2</div>
            <button
              onClick={handleGenerateNoblePhantasm2}
              disabled={isConfirmed || generatingNoblePhantasm2 || !data.characterId || !isCharacterBoxComplete}
              className="text-yellow-400 hover:text-yellow-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              title="보구 자동 생성"
            >
              {generatingNoblePhantasm2 ? (
                <span className="text-xs">생성 중...</span>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={data.noblePhantasm2Name ?? ''}
              onChange={(e) => updateData('noblePhantasm2Name', e.target.value)}
              disabled={isConfirmed || !isCharacterBoxComplete}
              className={`${inputClass} ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="보구명"
            />
            <textarea
              value={data.noblePhantasm2TrueName ?? ''}
              onChange={(e) => updateData('noblePhantasm2TrueName', e.target.value)}
              disabled={isConfirmed || !isCharacterBoxComplete}
              className={`${inputClass} resize-y min-h-[60px] ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="진명개방"
              rows={2}
            />
          </div>
        </div>

        {/* 플레이버 텍스트 */}
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-white/70">설명/플레이버 텍스트</label>
            <button
              onClick={handleGenerateFlavorText}
              disabled={isConfirmed || generatingFlavorText || !data.characterId || !isCharacterBoxComplete}
              className="text-yellow-400 hover:text-yellow-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              title="플레이버 텍스트 자동 생성"
            >
              {generatingFlavorText ? (
                <span className="text-xs">생성 중...</span>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </button>
          </div>
          <textarea
            value={data.flavorText ?? ''}
            onChange={(e) => updateData('flavorText', e.target.value)}
            disabled={isConfirmed || !isCharacterBoxComplete}
            className={`${inputClass} resize-y min-h-[80px] ${isConfirmed || !isCharacterBoxComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder="카드의 배경 스토리나 캐릭터 설명을 입력하세요"
            rows={3}
          />
        </div>

        {/* 카드 데이터 일괄 생성 버튼 */}
        <div className="border-t border-white/10 pt-3">
          <button
            onClick={handleGenerateCardData}
            disabled={isConfirmed || generatingCardData || !data.characterId || !isCharacterBoxComplete}
            className="w-full py-2 px-4 bg-yellow-400/20 hover:bg-yellow-400/30 disabled:bg-gray-500/20 disabled:cursor-not-allowed text-yellow-400 hover:text-yellow-300 disabled:text-gray-500 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            title="보구1, 보구2, 플레이버 텍스트 자동 생성"
          >
            {generatingCardData ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>생성 중...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>카드 데이터 자동 생성</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export const CardOptionNode = memo(CardOptionNodeComponent);
