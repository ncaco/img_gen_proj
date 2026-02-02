'use client';

import { memo, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useCategoryOptions } from '../context/CategoryOptionsContext';

export type InputParamsNodeData = {
  이름?: string;
  성별?: string;
  클래스?: string;
  /** 클래스 3뎁스 (2뎁스 선택 시 하위) */
  클래스_하위?: string;
  /** 클래스 4뎁스 (3뎁스 선택 시 하위) */
  클래스_하위2?: string;
  속성?: string;
};

function InputParamsNodeComponent({ data, id }: NodeProps<{ label?: string } & InputParamsNodeData>) {
  const { setNodes } = useReactFlow();
  const options = useCategoryOptions();
  const 성별_옵션 = options.gender;
  const 클래스_옵션 = options.class;
  const 클래스_트리 = options.classTree;
  const 속성_옵션 = options.attribute;

  const 클래스_2뎁스_노드 = 클래스_트리.find((n) => n.name === (data.클래스 ?? ''));
  const 클래스_3뎁스_옵션 = 클래스_2뎁스_노드?.children ?? [];
  const 클래스_3뎁스_노드 = 클래스_3뎁스_옵션.find((n) => n.name === (data.클래스_하위 ?? ''));
  const 클래스_4뎁스_옵션 = 클래스_3뎁스_노드?.children ?? [];

  const onChange = useCallback(
    (field: keyof InputParamsNodeData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const target = e.target;
        const value = target.type === 'radio' ? (target as HTMLInputElement).value : target.value;
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n
          )
        );
      },
    [id, setNodes]
  );

  const onClassChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, 클래스: value, 클래스_하위: '', 클래스_하위2: '' } }
            : n
        )
      );
    },
    [id, setNodes]
  );

  const onClassSubChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, 클래스_하위: value, 클래스_하위2: '' } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div className="rounded-2xl min-w-[320px] max-w-[420px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="text-sm font-medium text-white/90">입력 파라미터</span>
      </div>
      <div className="p-4">
        {/* 마인드맵 루트: 이름 */}
        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1.5 font-medium">이름</label>
          <input
            type="text"
            value={data.이름 ?? ''}
            onChange={onChange('이름')}
            placeholder="이름 입력"
            className="w-full rounded-xl px-4 py-2.5 text-sm bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
          />
        </div>
        {/* 가지 연결선 */}
        <div className="flex justify-center mb-3">
          <span className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="text-[10px] text-white/40 mx-2 uppercase tracking-wider">경우의 수</span>
          <span className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent via-white/20 to-transparent" />
        </div>
        {/* 마인드맵 가지: 성별 | 속성 | 클래스 */}
        <div className="grid grid-cols-3 gap-3">
          {/* 성별 */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col">
            <label className="text-xs text-white/60 mb-2 font-medium">성별</label>
            <div className="flex flex-col gap-1.5">
              {성별_옵션.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`${id}-성별`}
                    value={opt}
                    checked={(data.성별 ?? '') === opt}
                    onChange={onChange('성별')}
                    className="rounded-full border-white/30 text-[#6366f1] focus:ring-white/30"
                  />
                  <span className="text-sm text-white/80">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 속성 */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col">
            <label className="text-xs text-white/60 mb-2 font-medium">속성</label>
            <select
              value={data.속성 ?? ''}
              onChange={onChange('속성')}
              className="w-full rounded-lg px-2 py-1.5 text-sm bg-[#2a2a30] border border-white/15 !text-white focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-[#1a1a1f] [&>option]:text-white"
            >
              <option value="">선택</option>
              {속성_옵션.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {/* 클래스 */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2">
            <label className="text-xs text-white/60 font-medium">클래스</label>
            <select
              value={data.클래스 ?? ''}
              onChange={onClassChange}
              className="w-full rounded-lg px-2 py-1.5 text-sm bg-[#2a2a30] border border-white/15 !text-white focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-[#1a1a1f] [&>option]:text-white"
            >
              <option value="">선택</option>
              {클래스_옵션.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {클래스_3뎁스_옵션.length > 0 && (
              <select
                value={data.클래스_하위 ?? ''}
                onChange={onClassSubChange}
                className="w-full rounded-lg px-2 py-1.5 text-xs bg-[#2a2a30] border border-white/15 !text-white focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-[#1a1a1f] [&>option]:text-white"
                title="클래스 하위 (3뎁스)"
              >
                <option value="">3뎁스 선택</option>
                {클래스_3뎁스_옵션.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            )}
            {클래스_4뎁스_옵션.length > 0 && (
              <select
                value={data.클래스_하위2 ?? ''}
                onChange={onChange('클래스_하위2')}
                className="w-full rounded-lg px-2 py-1.5 text-xs bg-[#2a2a30] border border-white/15 !text-white focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-[#1a1a1f] [&>option]:text-white"
                title="클래스 하위 (4뎁스)"
              >
                <option value="">4뎁스 선택</option>
                {클래스_4뎁스_옵션.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-white/40" />
    </div>
  );
}

export const InputParamsNode = memo(InputParamsNodeComponent);
