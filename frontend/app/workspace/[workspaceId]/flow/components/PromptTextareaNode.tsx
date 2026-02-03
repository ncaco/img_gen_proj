'use client';

import { memo, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';

export const PROMPT_NODE_ID = 'prompt-textarea-1';

export type PromptTextareaNodeData = {
  /** 이미지 생성 프롬프트 */
  promptText?: string;
};

function PromptTextareaNodeComponent(props: NodeProps) {
  const { data: rawData, id } = props;
  const data = rawData as PromptTextareaNodeData;
  const { setNodes } = useReactFlow();

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, promptText: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div className="rounded-xl min-w-[280px] max-w-[400px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" id="left" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <Handle type="target" id="top" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="rounded-t-xl border-b border-white/10 p-2.5 bg-white/5">
        <div className="text-white/90 font-medium text-xs">이미지 생성 프롬프트</div>
      </div>
      <div className="p-2.5">
        <textarea
          value={data.promptText ?? ''}
          onChange={onChange}
          placeholder="세계관·클래스 정보를 바탕으로 프롬프트를 입력하세요"
          rows={6}
          className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 resize-y min-h-[120px]"
        />
      </div>
    </div>
  );
}

export const PromptTextareaNode = memo(PromptTextareaNodeComponent);
