'use client';

import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import DropZone from './components/DropZone';
import CardPreview from './components/CardPreview';
import CardForm from './components/CardForm';
import StepTabs, { Step } from './components/StepTabs';
import ResultPanel from './components/ResultPanel';
import { buildPrompt } from './lib/promptBuilder';

interface CardFormData {
  cardName: string;
  type: string;
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
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>();
  const cardPreviewRef = useRef<HTMLDivElement>(null); // 화면 오른쪽 실시간 미리보기
  const [formData, setFormData] = useState<CardFormData>({
    cardName: '',
    type: '',
    attribute: '',
    rarity: '',
    attack: '',
    health: '',
    skill1Name: '',
    skill1Description: '',
    skill2Name: '',
    skill2Description: '',
    flavorText: '',
    cardNumber: '',
    series: '',
  });

  // 단계별 완료 및 활성화 상태 계산
  const imageStepCompleted = !!(characterImage && backgroundImage);
  const infoStepCompleted = 
    formData.cardName.trim() !== '' &&
    formData.type.trim() !== '' &&
    formData.attribute.trim() !== '' &&
    formData.rarity.trim() !== '';

  const steps = {
    image: {
      completed: imageStepCompleted,
      enabled: true, // 첫 단계는 항상 활성화
    },
    info: {
      completed: infoStepCompleted,
      enabled: true, // 이미지 업로드 후 활성화 (이미지가 없어도 활성화)
    },
    result: {
      completed: !!previewImageUrl,
      enabled: !!previewImageUrl, // 결과가 생성되면 활성화
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

  // 프롬프트 생성 함수 (공통 템플릿 사용)
  const generatePrompt = (): string =>
    buildPrompt({
      type: formData.type,
      rarity: formData.rarity,
      cardName: formData.cardName,
      attribute: formData.attribute,
      attack: formData.attack,
      health: formData.health,
      cardNumber: formData.cardNumber,
      skill1Name: formData.skill1Name,
      skill1Description: formData.skill1Description,
      skill2Name: formData.skill2Name,
      skill2Description: formData.skill2Description,
      flavorText: formData.flavorText,
      series: formData.series,
      characterImageRef: characterImage ? '업로드된 캐릭터 이미지 스타일 참고' : '없음',
      backgroundImageRef: backgroundImage ? '업로드된 배경 이미지 스타일 참고' : '없음',
    });

  // 이미지 로드 대기 함수 (img 태그와 배경 이미지 모두)
  const waitForImages = (element: HTMLElement): Promise<void> => {
    return new Promise((resolve) => {
      const images: HTMLImageElement[] = [];
      
      // img 태그 찾기
      element.querySelectorAll('img').forEach((img) => {
        images.push(img as HTMLImageElement);
      });
      
      // 배경 이미지가 있는 div 찾기
      const bgDivs = element.querySelectorAll('div[style*="background-image"]');
      bgDivs.forEach((div) => {
        const style = window.getComputedStyle(div);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const urlMatch = bgImage.match(/url\(["']?([^"']+)["']?\)/);
          if (urlMatch) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = urlMatch[1];
            images.push(img);
          }
        }
      });
      
      if (images.length === 0) {
        setTimeout(resolve, 200); // 스타일 적용 대기
        return;
      }
      
      let loadedCount = 0;
      const totalImages = images.length;
      
      const checkComplete = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          // 추가로 약간의 시간을 두어 렌더링 완료 보장
          setTimeout(resolve, 300);
        }
      };
      
      images.forEach((img) => {
        if (img.complete || img.tagName === 'IMG' && (img as HTMLImageElement).complete) {
          checkComplete();
        } else {
          img.onload = checkComplete;
          img.onerror = checkComplete; // 에러가 나도 진행
        }
      });
    });
  };

  // 카드 미리보기 이미지 생성 (html-to-image 사용)
  // 화면 오른쪽 "실시간 미리보기" 영역에 렌더링된 카드 그대로를 캡처
  const generatePreviewImage = async (): Promise<string> => {
    if (!cardPreviewRef.current) return '';

    try {
      // CardPreview 컴포넌트의 최상위 div 요소 찾기 (data-card-preview 속성 사용)
      const cardElement =
        (cardPreviewRef.current.querySelector(
          'div[data-card-preview="true"]',
        ) as HTMLElement | null) || cardPreviewRef.current;

      // 이미지 로드 대기
      await waitForImages(cardElement);

      // 추가 렌더링 대기 (폰트/그라데이션 등 마무리용)
      await new Promise((resolve) => setTimeout(resolve, 200));

      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        pixelRatio: 2, // 고해상도 (2배)
        backgroundColor: 'transparent',
      });

      return dataUrl;
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      return '';
    }
  };

  // base64 이미지를 Blob으로 변환
  const base64ToBlob = (base64: string, mimeType: string = 'image/png'): Blob => {
    const base64Data = base64.split(',')[1] || base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // 이미지 업로드 함수
  const uploadImage = async (imageData: string, imageType: 'character' | 'background'): Promise<string | null> => {
    if (!imageData) return null;
    
    try {
      // base64를 Blob으로 변환
      const blob = base64ToBlob(imageData);
      const file = new File([blob], `${imageType}_${Date.now()}.png`, { type: 'image/png' });
      
      // FormData 생성
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subdirectory', 'cards');
      
      // 서버에 업로드
      const response = await fetch('http://localhost:8000/api/v1/upload/single', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('이미지 업로드 실패');
      }
      
      const result = await response.json();
      return result.file_url || null;
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      return null;
    }
  };

  // 생성 버튼 클릭 핸들러
  const handleGenerate = async () => {
    try {
      const prompt = generatePrompt();
      setGeneratedPrompt(prompt);
      
      // 미리보기 이미지 생성
      const imageUrl = await generatePreviewImage();
      setPreviewImageUrl(imageUrl);
      
      // 이미지 업로드
      const characterImageUrl = characterImage 
        ? await uploadImage(characterImage, 'character')
        : null;
      const backgroundImageUrl = backgroundImage
        ? await uploadImage(backgroundImage, 'background')
        : null;
      
      // 생성된 이미지도 업로드 (있는 경우)
      let generatedImageUrl = null;
      if (imageUrl) {
        generatedImageUrl = await uploadImage(imageUrl, 'generated');
      }
      
      // 카드 정보를 서버에 저장
      const saveResponse = await fetch('http://localhost:8000/api/v1/cards/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardData: {
            cardName: formData.cardName,
            type: formData.type,
            attribute: formData.attribute,
            rarity: formData.rarity,
            attack: formData.attack || '0',
            health: formData.health || '0',
            skill1Name: formData.skill1Name || '',
            skill1Description: formData.skill1Description || '',
            skill2Name: formData.skill2Name || '',
            skill2Description: formData.skill2Description || '',
            flavorText: formData.flavorText || '',
            cardNumber: formData.cardNumber || '',
            series: formData.series || '',
          },
          characterImageUrl: characterImageUrl,
          backgroundImageUrl: backgroundImageUrl,
          generatedPrompt: prompt,
          generatedImageUrl: generatedImageUrl,
        }),
      });
      
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.detail || '카드 저장 실패');
      }
      
      const saveResult = await saveResponse.json();
      console.log('카드 저장 성공:', saveResult);
      
      // 결과 탭으로 이동
      setCurrentStep('result');
    } catch (error) {
      console.error('카드 생성/저장 오류:', error);
      alert(`오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // 폼 데이터를 카드 데이터로 변환
  const cardData = {
    characterImage,
    backgroundImage,
    cardName: formData.cardName,
    type: formData.type,
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
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      ✓ 카드 정보 입력이 완료되었습니다. 오른쪽에서 생성 버튼을 클릭하세요.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3단계: 결과 */}
            {currentStep === 'result' && (
              <ResultPanel
                prompt={generatedPrompt}
                previewImageUrl={previewImageUrl}
                cardData={cardData}
              />
            )}
          </div>

          {/* 오른쪽: 항상 표시되는 카드 미리보기 (고정) */}
          <div className="hidden xl:block flex-shrink-0">
            <div className="sticky top-8">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                실시간 미리보기
              </h3>
              <div ref={cardPreviewRef}>
                <CardPreview cardData={cardData} />
              </div>
              
              {/* 생성 및 초기화 버튼 */}
              {currentStep === 'info' && (
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    onClick={handleGenerate}
                    disabled={!infoStepCompleted}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
                    title="카드 생성하기"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setCharacterImage(undefined);
                      setBackgroundImage(undefined);
                      setFormData({
                        cardName: '',
                        type: '',
                        attribute: '',
                        rarity: '',
                        attack: '',
                        health: '',
                        skill1Name: '',
                        skill1Description: '',
                        skill2Name: '',
                        skill2Description: '',
                        flavorText: '',
                        cardNumber: '',
                        series: '',
                      });
                      setGeneratedPrompt('');
                      setPreviewImageUrl(undefined);
                      setCurrentStep('image');
                    }}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                    title="초기화"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
