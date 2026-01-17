'use client';

import { useState } from 'react';
import DropZone from './components/DropZone';
import CardPreview from './components/CardPreview';
import CardForm from './components/CardForm';
import StepTabs, { Step } from './components/StepTabs';

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

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('image');
  const [characterImage, setCharacterImage] = useState<string | undefined>();
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>();
  const [formData, setFormData] = useState<CardFormData>({
    cardName: '카드명',
    type: {
      kingdom: '',
      phylum: '',
      class: '',
      order: '',
      family: '',
      genus: '',
      species: '',
    },
    attribute: '속성',
    rarity: '[등급 아이콘]',
    attack: '0',
    health: '0',
    skill1Name: '스킬명',
    skill1Description: '효과 설명',
    skill2Name: '스킬명',
    skill2Description: '효과 설명',
    flavorText: '설명/플레이버 텍스트',
    cardNumber: '[카드 번호]',
    series: '[제작자/시리즈 정보]',
  });

  // 단계별 완료 및 활성화 상태 계산
  const imageStepCompleted = !!(characterImage && backgroundImage);
  const infoStepCompleted = 
    formData.cardName !== '카드명' &&
    (formData.type.kingdom || formData.type.species) &&
    formData.attribute !== '속성' &&
    formData.rarity !== '[등급 아이콘]';

  const steps = {
    image: {
      completed: imageStepCompleted,
      enabled: true, // 첫 단계는 항상 활성화
    },
    info: {
      completed: infoStepCompleted,
      enabled: true, // 이미지 업로드 후 활성화 (이미지가 없어도 활성화)
    },
  };

  const handleImageDrop = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      // 첫 번째 이미지는 캐릭터, 두 번째는 배경으로 설정
      if (!characterImage) {
        setCharacterImage(imageUrl);
        // 첫 번째 이미지 업로드 시 바로 정보 탭으로 이동
        if (currentStep === 'image') {
          setTimeout(() => setCurrentStep('info'), 300);
        }
      } else if (!backgroundImage) {
        setBackgroundImage(imageUrl);
        // 배경 이미지도 업로드되면 정보 탭으로 이동 (이미 정보 탭에 있으면 유지)
        if (currentStep === 'image') {
          setTimeout(() => setCurrentStep('info'), 300);
        }
      } else {
        // 이미 둘 다 있으면 캐릭터 이미지 교체
        setCharacterImage(imageUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setCharacterImage(undefined);
    setBackgroundImage(undefined);
  };

  // 폼 데이터를 카드 데이터로 변환
  const cardData = {
    characterImage,
    backgroundImage,
    cardName: formData.cardName,
    type: formData.type, // TypeData 객체 전달
    attribute: formData.attribute,
    rarity: formData.rarity,
    attack: formData.attack,
    health: formData.health,
    skill1: {
      name: formData.skill1Name,
      description: formData.skill1Description,
    },
    skill2: {
      name: formData.skill2Name,
      description: formData.skill2Description,
    },
    flavorText: formData.flavorText,
    cardNumber: formData.cardNumber,
    series: formData.series,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            카드 생성기
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            단계별로 카드를 생성하세요
          </p>
        </div>

        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* 왼쪽: 단계 탭 */}
          <div className="flex-shrink-0">
            <StepTabs currentStep={currentStep} onStepChange={setCurrentStep} steps={steps} />
          </div>

          {/* 중앙: 단계별 콘텐츠 영역 */}
          <div className="flex-1 space-y-6">
            {/* 1단계: 이미지 업로드 */}
            {currentStep === 'image' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    이미지 업로드
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    캐릭터 이미지와 배경 이미지를 업로드하세요
                  </p>
                  <DropZone onImageDrop={handleImageDrop} />
                </div>

                {/* 이미지 미리보기 */}
                {(characterImage || backgroundImage) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {characterImage && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          캐릭터 이미지
                        </h3>
                        <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={characterImage}
                            alt="캐릭터"
                            className="w-full h-full object-contain"
                          />
                          <button
                            onClick={() => setCharacterImage(undefined)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}

                    {backgroundImage && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          배경 이미지
                        </h3>
                        <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={backgroundImage}
                            alt="배경"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setBackgroundImage(undefined)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {imageStepCompleted && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      ✓ 이미지 업로드가 완료되었습니다. 다음 단계로 진행하세요.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2단계: 카드 정보 입력 */}
            {currentStep === 'info' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    카드 정보 입력
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    카드의 상세 정보를 입력하세요
                  </p>
                </div>
                <CardForm formData={formData} onChange={setFormData} />
                {infoStepCompleted && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      ✓ 카드 정보 입력이 완료되었습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽: 항상 표시되는 카드 미리보기 (고정) */}
          <div className="hidden xl:block flex-shrink-0">
            <div className="sticky top-8">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                실시간 미리보기
              </h3>
              <CardPreview cardData={cardData} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
