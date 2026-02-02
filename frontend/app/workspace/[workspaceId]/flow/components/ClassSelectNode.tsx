'use client';

import { memo, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useCategoryOptions } from '../context/CategoryOptionsContext';

export type ClassSelectNodeData = {
  클래스?: string;
  클래스_하위?: string;
  클래스_하위2?: string;
};

function ClassSelectNodeComponent({ data, id }: NodeProps<{ label?: string } & ClassSelectNodeData>) {
  const { setNodes } = useReactFlow();
  const options = useCategoryOptions();
  const 클래스_옵션 = options.class;
  const 클래스_트리 = options.classTree;

  const 클래스_2뎁스_노드 = 클래스_트리.find((n) => n.name === (data.클래스 ?? ''));
  const 클래스_3뎁스_옵션 = 클래스_2뎁스_노드?.children ?? [];
  const 클래스_3뎁스_노드 = 클래스_3뎁스_옵션.find((n) => n.name === (data.클래스_하위 ?? ''));
  const 클래스_4뎁스_옵션 = 클래스_3뎁스_노드?.children ?? [];

  const onChange = useCallback(
    (field: keyof ClassSelectNodeData) =>
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
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
    <div className="rounded-xl min-w-[180px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-hidden">
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">클래스</span>
      </div>
      <div className="p-3 space-y-2">
        <select
          value={data.클래스 ?? ''}
          onChange={onClassChange}
          className="w-full rounded-lg px-3 py-2 text-sm bg-[#2a2a30] border border-white/15 !text-white focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-[#1a1a1f] [&>option]:text-white"
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
            title="3뎁스"
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
            title="4뎁스"
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
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/40" />
    </div>
  );
}

export const ClassSelectNode = memo(ClassSelectNodeComponent);
