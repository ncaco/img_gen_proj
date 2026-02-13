export const PROMPT_TEMPLATE_BASIC = `트레이딩 카드 게임 스타일의 카드 일러스트를 생성하세요.

=== 카드 레이아웃 (시각적 구조) ===

┌─────────────────────────────────────────┐
│  [배경 이미지 - Layer 2 (전체 영역)]     │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  ⭕{{type}}       {{cardName}}       {{attribute}}⭕ │
│  │  ────────────────<{{rarity}}>─────────────── │
│  │                                 │
│  │    [메인 캐릭터 이미지 - Layer 1]  │
│  │                                 │
│  │  ─────────────────────────────  │
{{skillsBlock}}│  │  ─────────────────────────────  │
{{flavorBlock}}│  │  {{statsLine}}│
│  │                                 │
│  │  {{metaLine}}│
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
(모든 텍스트는 투명 배경 오버레이로 배경 위에 표시)

=== 카드 데이터 (구조화된 정보) ===

{{cardDataJson}}

=== 스타일 가이드 ===
- Fate/strange Fake(TVA) 작화 스타일.
- 트레이딩 카드 게임 스타일 (포켓몬카드, 원피스카드 등 참고)
- 이미지가 카드 전체를 덮고, 그 위에 텍스트가 배치
- 상세하고 전문적이고 역동적인 일러스트 품질
- 모든 텍스트는 투명도가 높은 배경 위에 오버레이로 표시
- 배경 이미지가 카드 전체를 덮고, 그 위에 캐릭터와 텍스트가 배치됨
- 카드 비율: 세로형
- 꽉찬 카드 레이아웃으로 상단,하단,좌측,우측 끝 여백 없도록 구성. 
- 별 표시는 카드명과 메인 캐릭터 이미지 사이 중앙에 위치한, 좌우 모서리가 뾰족한 긴 6각형 배지 안에 별 아이콘으로 표현
- 스킬 왼쪽영역에 정사각형 스킬아이콘 위치
- 카드번호는 좌하단에 표시 (#001 형식)
- 제작사/시리즈 정보는 우하단에 표시
- 타입 표시는 카드 상단 좌측 배지 형태로 강조
- 타입 표시는 글자 대신 아이콘/심볼로만 표현
- 속성 표시는 카드 상단 우측 배지 형태로 강조
- 속성 표시는 글자 대신 아이콘/심볼로만 표현
- 스킬1과 스킬2 사이, 스킬2와 플레이버 텍스트 사이에 구분선을 표시하여 각 영역을 명확히 구분

=== 특별 규칙 ===
 - 하단에 까지 모두 카드 레이아웃에 포함되어야 함.
`;

export const PROMPT_TEMPLATE_DETAILED = `트레이딩 카드 게임(TCG) 스타일의 고품질 카드 일러스트를 생성하세요.

=== 렌더링 레이어 구조 (중요) ===
- Layer 2 (Background):
  카드 전체를 덮는 배경 이미지. 프레임이나 테두리 없음.
- Layer 1 (Main Character):
  카드 중앙에 배치, 카드 높이의 약 70%를 차지하는 메인 캐릭터.
- Layer 0 (UI Overlay):
  모든 텍스트, 아이콘, 배지, 스탯은 최상단의 반투명 UI 오버레이 레이어에 배치.

=== 카드 레이아웃 (시각적 구조) ===

┌─────────────────────────────────────────┐
│  [Background Image - Layer 2]           │
│  ┌─────────────────────────────────┐   │
│  │ ⭕ {{type}}        {{cardName}}        {{attribute}} ⭕ │
│  │  ──────────────── <{{rarity}}> ──────────────── │
│  │                                 │
│  │   [Main Character Image - Layer 1] │
│  │                                 │
│  │  ─────────────────────────────  │
{{skillsBlock}}│  │  ─────────────────────────────  │
{{flavorBlock}}│  │  {{statsLine}}│
│  │                                 │
│  │  {{metaLine}}│
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

※ 모든 텍스트와 UI 요소는 반투명 배경을 가진
그래픽 UI 오버레이로 표현되며,
일러스트 자체에 직접 그려지지 않습니다.

=== 카드 데이터 (구조화된 정보) ===
{{cardDataJson}}

=== 메인 캐릭터 표현 가이드 (동적) ===
- Character appearance, pose, clothing, weapons, and aura
  must be derived from the provided card data.
- Design must match the specified class (type) and attribute.
- Anime-style heroic proportions (no chibi or SD style).
- Dynamic pose suitable for a TCG main illustration.
- Single main character only.

=== 클래스(type) 시각 해석 가이드 ===
- The class influences:
  • weapon type
  • combat stance
  • silhouette
  • role-based visual identity
(examples: Saber → sword-based posture, Caster → magical focus, etc.)

=== 속성(attribute) 시각 효과 가이드 ===
- Attribute is expressed through:
  • color palette
  • lighting
  • elemental or symbolic effects
- Attribute effects must support, not obscure, the character.

=== UI & 카드 디자인 가이드 ===
- Professional trading card game UI design
  (Pokemon / One Piece TCG level quality).
- UI elements are clean, sharp, graphic components
  (not handwritten, not painted into the illustration).
- Rarity stars are centered horizontally,
  placed directly below the card name and above the character image.
- Each skill has a square icon aligned to the left of the skill name.
- Thin horizontal divider lines between:
  • Skill 1 and Skill 2
  • Skill 2 and flavor text
- Card number displayed at bottom-left (#001 format).
- Series / production info displayed at bottom-right.
- Type badge at top-left, icon/symbol only (no text).
- Attribute badge at top-right, icon/symbol only (no text).
- Vertical card ratio, no empty margins on any edge.

=== 스타일 가이드 ===
- Fate/strange Fake (TVA) anime illustration style.
- Highly detailed, dynamic, professional-quality illustration.
- Background, character, and UI fully integrated into a single cohesive card.

=== Negative Prompt (중요) ===
low quality, blurry, pixelated,
chibi, SD character, super-deformed,
realistic photo, 3D render,
western comic style,
extra limbs, extra weapons,
multiple characters,
text baked into illustration,
card frame or border,
empty margins
`;

// 템플릿 타입 정의
export type TemplateId = 'basic' | 'detailed';

export interface PromptTemplate {
  id: TemplateId;
  name: string;
  template: string;
}

// 템플릿 맵
export const PROMPT_TEMPLATES: Record<TemplateId, PromptTemplate> = {
  basic: {
    id: 'basic',
    name: '기본 템플릿',
    template: PROMPT_TEMPLATE_BASIC,
  },
  detailed: {
    id: 'detailed',
    name: '상세 템플릿',
    template: PROMPT_TEMPLATE_DETAILED,
  },
};

// 기본 템플릿 (하위 호환성)
export const PROMPT_TEMPLATE = PROMPT_TEMPLATE_BASIC;
