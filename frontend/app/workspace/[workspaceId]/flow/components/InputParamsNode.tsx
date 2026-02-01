'use client';

import { memo, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useCategoryOptions } from '../context/CategoryOptionsContext';

export type InputParamsNodeData = {
  이름?: string;
  성별?: string;
  클래스?: string;
  속성?: string;
};

function InputParamsNodeComponent({ data, id }: NodeProps<{ label?: string } & InputParamsNodeData>) {
  const { setNodes } = useReactFlow();
  const options = useCategoryOptions();
  const 성별_옵션 = options.gender;
  const 클래스_옵션 = options.class;
  const 속성_옵션 = options.attribute;

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

  return (
    <div className="rounded-2xl min-w-[220px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="text-sm font-medium text-white/90">입력 파라미터</span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs text-white/60 mb-1">이름</label>
          <input
            type="text"
            value={data.이름 ?? ''}
            onChange={onChange('이름')}
            placeholder="이름 입력"
            className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
          />
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-2">성별</label>
          <div className="flex gap-4">
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
        <div>
          <label className="block text-xs text-white/60 mb-1">클래스</label>
          <select
            value={data.클래스 ?? ''}
            onChange={onChange('클래스')}
            className="w-full rounded-lg px-3 py-2 text-sm bg-[#2a2a30] border border-white/15 !text-white focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-[#1a1a1f] [&>option]:text-white"
          >
            <option value="">선택</option>
            {클래스_옵션.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">속성</label>
          <select
            value={data.속성 ?? ''}
            onChange={onChange('속성')}
            className="w-full rounded-lg px-3 py-2 text-sm bg-[#2a2a30] border border-white/15 !text-white focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-[#1a1a1f] [&>option]:text-white"
          >
            <option value="">선택</option>
            {속성_옵션.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-white/40" />
    </div>
  );
}

export const InputParamsNode = memo(InputParamsNodeComponent);
