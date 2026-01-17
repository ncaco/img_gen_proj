'use client';

import React from 'react';
import TypeSelector from './TypeSelector';

interface TypeData {
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
}

interface CardFormData {
  cardName: string;
  type: TypeData;
  attribute: string;
  rarity: string;
  attack: string;
  health: string;
  skill1Name: string;
  skill1Description: string;
  skill2Name: string;
  skill2Description: string;
  flavorText: string;
  cardNumber: string;
  series: string;
}

interface CardFormProps {
  formData: CardFormData;
  onChange: (data: CardFormData) => void;
}

export default function CardForm({ formData, onChange }: CardFormProps) {
  const handleChange = (field: keyof CardFormData, value: string | TypeData) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        카드 정보 입력
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 카드명 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            카드명
          </label>
          <input
            type="text"
            value={formData.cardName}
            onChange={(e) => handleChange('cardName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="카드명을 입력하세요"
          />
        </div>

        {/* 타입 - 생물 분류 체계 */}
        <div className="md:col-span-2">
          <TypeSelector
            value={formData.type}
            onChange={(type) => {
              onChange({
                ...formData,
                type,
              });
            }}
          />
        </div>

        {/* 속성 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            속성
          </label>
          <select
            value={formData.attribute}
            onChange={(e) => handleChange('attribute', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="속성">속성 선택</option>
            <option value="🔥">🔥 불</option>
            <option value="💧">💧 물</option>
            <option value="🌍">🌍 땅</option>
            <option value="💨">💨 바람</option>
            <option value="✨">✨ 빛</option>
            <option value="🌑">🌑 어둠</option>
          </select>
        </div>

        {/* 등급 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            등급
          </label>
          <select
            value={formData.rarity}
            onChange={(e) => handleChange('rarity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="[등급 아이콘]">등급 선택</option>
            <option value="⭐">⭐ 일반</option>
            <option value="⭐⭐">⭐⭐ 레어</option>
            <option value="⭐⭐⭐">⭐⭐⭐ 슈퍼레어</option>
            <option value="⭐⭐⭐⭐">⭐⭐⭐⭐ 울트라레어</option>
          </select>
        </div>

        {/* 공격력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            공격력
          </label>
          <input
            type="number"
            value={formData.attack}
            onChange={(e) => handleChange('attack', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            min="0"
          />
        </div>

        {/* 체력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            체력
          </label>
          <input
            type="number"
            value={formData.health}
            onChange={(e) => handleChange('health', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            min="0"
          />
        </div>

        {/* 카드 번호 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            카드 번호
          </label>
          <input
            type="text"
            value={formData.cardNumber}
            onChange={(e) => handleChange('cardNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="#001"
          />
        </div>

        {/* 시리즈 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            시리즈/제작자
          </label>
          <input
            type="text"
            value={formData.series}
            onChange={(e) => handleChange('series', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="시리즈명 또는 제작자명"
          />
        </div>
      </div>

      {/* 스킬 1 */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">
          스킬 1
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              스킬명
            </label>
            <input
              type="text"
              value={formData.skill1Name}
              onChange={(e) => handleChange('skill1Name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="스킬명을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              효과 설명
            </label>
            <textarea
              value={formData.skill1Description}
              onChange={(e) => handleChange('skill1Description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="스킬 효과를 설명하세요"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* 스킬 2 */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">
          스킬 2
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              스킬명
            </label>
            <input
              type="text"
              value={formData.skill2Name}
              onChange={(e) => handleChange('skill2Name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="스킬명을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              효과 설명
            </label>
            <textarea
              value={formData.skill2Description}
              onChange={(e) => handleChange('skill2Description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="스킬 효과를 설명하세요"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* 플레이버 텍스트 */}
      <div className="border-t pt-4 mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          설명/플레이버 텍스트
        </label>
        <textarea
          value={formData.flavorText}
          onChange={(e) => handleChange('flavorText', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="카드의 배경 스토리나 캐릭터 설명을 입력하세요"
          rows={3}
        />
      </div>
    </div>
  );
}
