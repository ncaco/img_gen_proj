'use client';

import { memo, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useCategoryOptions } from '../context/CategoryOptionsContext';

export type AttributeSelectNodeData = {
  속성?: string;
};

function AttributeSelectNodeComponent({ data, id }: NodeProps<{ label?: string } & AttributeSelectNodeData>) {
  const { setNodes } = useReactFlow();
  const options = useCategoryOptions();
  const 속성_옵션 = options.attribute;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, 속성: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div className="rounded-xl min-w-[180px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-hidden">
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">속성</span>
      </div>
      <div className="p-3">
        <select
          value={data.속성 ?? ''}
          onChange={onChange}
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
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/40" />
    </div>
  );
}

export const AttributeSelectNode = memo(AttributeSelectNodeComponent);
