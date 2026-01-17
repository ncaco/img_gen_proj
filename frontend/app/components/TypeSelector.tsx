'use client';

import React from 'react';
import taxonomyData from '../data/taxonomy.json';

export default function TypeSelector({ value, onChange }: TypeSelectorProps) {
  const handleChange = (field: keyof TypeData, newValue: string) => {
    const newType: TypeData = { ...value };
    
    // 선택된 필드 업데이트
    newType[field] = newValue;
    
    // 하위 분류 초기화
    const fields: (keyof TypeData)[] = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
    const currentIndex = fields.indexOf(field);
    for (let i = currentIndex + 1; i < fields.length; i++) {
      newType[fields[i]] = '';
    }
    
    onChange(newType);
  };

  const getDisplayValue = () => {
    const parts = [];
    if (value.species) parts.push(value.species);
    else if (value.genus) parts.push(value.genus);
    else if (value.family) parts.push(value.family);
    else if (value.order) parts.push(value.order);
    else if (value.class) parts.push(value.class);
    else if (value.phylum) parts.push(value.phylum);
    else if (value.kingdom) parts.push(value.kingdom);
    return parts[0] || '타입 선택';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        타입
      </label>
      
      {/* 계층적 선택 */}
      <div className="space-y-2">
        {/* 계 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            대분류
          </label>
          <select
            value={value.kingdom}
            onChange={(e) => handleChange('kingdom', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">대분류 선택</option>
            {taxonomyData.kingdoms.map((kingdom) => (
              <option key={kingdom.value} value={kingdom.value}>
                {kingdom.label}
              </option>
            ))}
          </select>
        </div>

        {/* 문 */}
        {value.kingdom && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              중분류
            </label>
            <select
              value={value.phylum}
              onChange={(e) => handleChange('phylum', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">중분류 선택</option>
              {taxonomyData.phyla[value.kingdom as keyof typeof taxonomyData.phyla]?.map((phylum) => (
                <option key={phylum.value} value={phylum.value}>
                  {phylum.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 강 */}
        {value.phylum && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              소분류
            </label>
            <select
              value={value.class}
              onChange={(e) => handleChange('class', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">소분류 선택</option>
              {taxonomyData.classes[value.phylum as keyof typeof taxonomyData.classes]?.map((cls) => (
                <option key={cls.value} value={cls.value}>
                  {cls.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 목 */}
        {value.class && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              세분류
            </label>
            <select
              value={value.order}
              onChange={(e) => handleChange('order', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">세분류 선택</option>
              {taxonomyData.orders[value.class as keyof typeof taxonomyData.orders]?.map((order) => (
                <option key={order.value} value={order.value}>
                  {order.label}
                </option>
              ))}
            </select>
          </div>
        )}

      </div>

      {/* 선택된 타입 요약 표시 */}
      {(value.kingdom || value.phylum || value.class || value.order) && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-700 dark:text-gray-300">
          <div className="font-semibold mb-1">선택된 분류:</div>
          <div className="space-y-0.5">
            {value.kingdom && <div>대분류: {taxonomyData.kingdoms.find(k => k.value === value.kingdom)?.label}</div>}
            {value.phylum && <div>중분류: {taxonomyData.phyla[value.kingdom as keyof typeof taxonomyData.phyla]?.find(p => p.value === value.phylum)?.label}</div>}
            {value.class && <div>소분류: {taxonomyData.classes[value.phylum as keyof typeof taxonomyData.classes]?.find(c => c.value === value.class)?.label}</div>}
            {value.order && <div>세분류: {taxonomyData.orders[value.class as keyof typeof taxonomyData.orders]?.find(o => o.value === value.order)?.label}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
