'use client';

import { memo } from 'react';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import type { LoreMappingData } from '@/app/lib/flow';

export const LORE_NODE_ID = 'lore-1';

export type LoreResultNodeData = {
  loreMapping?: LoreMappingData | null;
  loreError?: string | null;
};

/** 항상 표시되는 읽기 전용 행. 값 없으면 placeholder 표시 */
function ValueRow({ label, value }: { label: string; value: string }) {
  const display = value || '-';
  return (
    <div className="flex gap-2">
      <span className="text-white/50 shrink-0">{label}:</span>
      <span className={`break-words ${value ? 'text-white/80' : 'text-white/40'}`}>{display}</span>
    </div>
  );
}

function LoreResultNodeComponent(props: NodeProps) {
  const { data: rawData } = props;
  const data = rawData as LoreResultNodeData;
  const lore = data.loreMapping;
  const loreError = data.loreError;

  return (
    <div className="rounded-xl min-w-[220px] max-w-[320px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <Handle
        type="source"
        id="to-prompt"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-white/60"
      />
      <div className="rounded-t-xl border-b border-white/10 p-2.5 bg-white/5">
        <div className="text-white/90 font-medium text-xs">세계관 분석</div>
      </div>
      <div className="p-2.5 space-y-1.5 text-xs">
        {loreError && (
          <p className="text-red-400">{loreError}</p>
        )}
        <ValueRow label="역사/신화" value={lore?.historicalOrMythical ?? ''} />
        <ValueRow label="시대" value={lore?.era ?? ''} />
        <ValueRow label="출신" value={lore?.originCountry ?? ''} />
        <ValueRow label="아키타입" value={lore?.mainArchetype ?? ''} />
        <ValueRow label="전설성" value={lore?.legendRank ?? ''} />
        <ValueRow label="신비도" value={lore?.mysteryLevel ?? ''} />
        <ValueRow label="신성" value={lore?.divinityPotential ?? ''} />
        <ValueRow
          label="업적"
          value={lore?.keyAchievements?.length ? lore.keyAchievements.join(', ') : ''}
        />
      </div>
    </div>
  );
}

export const LoreResultNode = memo(LoreResultNodeComponent);
