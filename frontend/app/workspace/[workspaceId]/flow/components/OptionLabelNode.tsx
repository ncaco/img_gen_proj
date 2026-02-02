'use client';

import { memo } from 'react';
import { Handle, type NodeProps, Position } from '@xyflow/react';

export type OptionLabelNodeData = {
  label: string;
  /** 성별 / 속성 / 클래스(3뎁스) */
  kind?: 'gender' | 'attribute' | 'class';
  /** 클래스일 때 부모 2뎁스 이름 */
  parentLabel?: string;
};

function OptionLabelNodeComponent({ data }: NodeProps<{ label?: string } & OptionLabelNodeData>) {
  const displayLabel = data.parentLabel ? `${data.parentLabel} · ${data.label}` : data.label;
  const kindColor =
    data.kind === 'gender'
      ? 'bg-violet-500/20 border-violet-400/30'
      : data.kind === 'attribute'
        ? 'bg-amber-500/20 border-amber-400/30'
        : 'bg-emerald-500/20 border-emerald-400/30';

  const targetPosition = data.kind === 'class' ? Position.Left : Position.Top;
  const isClass = data.kind === 'class';
  const sizeClass = isClass
    ? 'w-[120px] min-h-[40px] h-[40px] flex items-center justify-center'
    : 'min-w-[100px] px-3 py-2';
  return (
    <div
      className={`rounded-xl border shadow-lg ${kindColor} text-white/95 text-sm font-medium ${sizeClass}`}
    >
      <Handle type="target" position={targetPosition} className="!w-2.5 !h-2.5 !bg-white/40" />
      <span
        className={`block text-center truncate ${isClass ? 'w-full px-2' : 'max-w-[140px]'}`}
        title={displayLabel}
      >
        {data.label}
      </span>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/40" />
    </div>
  );
}

export const OptionLabelNode = memo(OptionLabelNodeComponent);
