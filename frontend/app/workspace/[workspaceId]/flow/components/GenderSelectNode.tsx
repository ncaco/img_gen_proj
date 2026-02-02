'use client';

import { memo, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useCategoryOptions } from '../context/CategoryOptionsContext';

export type GenderSelectNodeData = {
  성별?: string;
};

function GenderSelectNodeComponent({ data, id }: NodeProps<{ label?: string } & GenderSelectNodeData>) {
  const { setNodes } = useReactFlow();
  const options = useCategoryOptions();
  const 성별_옵션 = options.gender;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, 성별: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div className="rounded-xl min-w-[180px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-hidden">
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">성별</span>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        {성별_옵션.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${id}-성별`}
              value={opt}
              checked={(data.성별 ?? '') === opt}
              onChange={onChange}
              className="rounded-full border-white/30 text-[#6366f1] focus:ring-white/30"
            />
            <span className="text-sm text-white/80">{opt}</span>
          </label>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/40" />
    </div>
  );
}

export const GenderSelectNode = memo(GenderSelectNodeComponent);
