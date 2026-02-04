'use client';

import { memo, useCallback } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useCategoryOptions } from '../context/CategoryOptionsContext';

export const CATEGORY_SELECT_NODE_ID = 'category-select-1';

export type CategorySelectNodeData = {
  성별?: string;
  속성?: string;
  클래스?: string; // "부모 · 하위" 형식
};

const selectClass =
  'w-full rounded-lg px-3 py-2 text-sm bg-[#2a2a32] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-white/30 appearance-none cursor-pointer';
const optionStyle = { backgroundColor: '#2a2a32', color: '#fff' };

function CategorySelectNodeComponent(props: NodeProps) {
  const { data: rawData, id } = props;
  const data = rawData as CategorySelectNodeData;
  const { setNodes } = useReactFlow();
  const options = useCategoryOptions();
  const genderList = options.gender ?? [];
  const attributeList = options.attribute ?? [];
  const classTree = options.classTree ?? [];

  const updateData = useCallback(
    (key: keyof CategorySelectNodeData, value: string) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [key]: value } as CategorySelectNodeData } : n
        )
      );
    },
    [id, setNodes]
  );

  const classOptions: { value: string; label: string }[] = [];
  classTree.forEach((two) => {
    (two.children ?? []).forEach((three) => {
      const value = `${two.name} · ${three.name}`;
      classOptions.push({ value, label: value });
    });
  });

  return (
    <div className="rounded-xl min-w-[220px] max-w-[320px] bg-[#1a1a1f] border border-white/15 shadow-lg overflow-visible">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-white/40" />
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs font-medium text-white/90">추가 설정</span>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <label className="block text-xs text-white/70 mb-1">성별</label>
          <select
            value={data.성별 ?? ''}
            onChange={(e) => updateData('성별', e.target.value)}
            className={selectClass}
            aria-label="성별 선택"
          >
            <option value="" style={optionStyle}>선택</option>
            {genderList.map((label) => (
              <option key={label} value={label} style={optionStyle}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/70 mb-1">속성</label>
          <select
            value={data.속성 ?? ''}
            onChange={(e) => updateData('속성', e.target.value)}
            className={selectClass}
            aria-label="속성 선택"
          >
            <option value="" style={optionStyle}>선택</option>
            {attributeList.map((label) => (
              <option key={label} value={label} style={optionStyle}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/70 mb-1">클래스 / 하위클래스</label>
          <select
            value={data.클래스 ?? ''}
            onChange={(e) => updateData('클래스', e.target.value)}
            className={selectClass}
            aria-label="클래스 선택"
          >
            <option value="" style={optionStyle}>선택</option>
            {classOptions.map(({ value, label }) => (
              <option key={value} value={value} style={optionStyle}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export const CategorySelectNode = memo(CategorySelectNodeComponent);
