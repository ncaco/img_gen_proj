/**
 * 플로우 API: Lore(세계관) 분석 등
 */
import { API_BASE } from './auth';

export interface LoreMappingData {
  name: string;
  historicalOrMythical: string;
  originCountry: string | null;
  era: string;
  mainArchetype: string;
  legendRank: string;
  mysteryLevel: string;
  divinityPotential: string;
  noblePhantasms?: Array<{ 보구명: string; 진명개방: string }>;
  keyAchievements: string[];
}

export interface LoreMappingResponse {
  success: boolean;
  data: LoreMappingData;
  characterId: number;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** 이름·설명으로 인물 세계관 분석 (GPT 구조화 반환). 테이블에 저장 후 키(characterId) 반환. 로그인 필요. */
export async function fetchLoreMapping(params: {
  name: string;
  description?: string;
  characterId?: number;
  flowId?: number;
}): Promise<{ data: LoreMappingData; characterId: number }> {
  const res = await fetch(`${API_BASE}/api/v1/flow/lore-mapping`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: params.name.trim(),
      description: (params.description ?? '').trim(),
      character_id: params.characterId ?? null,
      flow_id: params.flowId ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '세계관 분석에 실패했습니다.');
  }
  const json: LoreMappingResponse = await res.json();
  if (!json.success || !json.data || json.characterId == null) throw new Error('응답 형식이 올바르지 않습니다.');
  return { data: json.data, characterId: json.characterId };
}

export interface FlowCharacter {
  id: number;
  name: string;
}

export interface FlowCharacterListResponse {
  success: boolean;
  total: number;
  characters: FlowCharacter[];
}

export interface FlowCharacterDetail {
  id: number;
  name: string;
  description?: string | null;
  historicalOrMythical?: string | null;
  originCountry?: string | null;
  era?: string | null;
  mainArchetype?: string | null;
  legendRank?: string | null;
  mysteryLevel?: string | null;
  divinityPotential?: string | null;
  noblePhantasms: Array<{ 보구명: string; 진명개방: string }>;
  keyAchievements: string[];
}

/** 현재 사용자의 FlowCharacter 목록 조회 (id, name만 반환). 로그인 필요. */
export async function listFlowCharacters(): Promise<FlowCharacterListResponse> {
  const res = await fetch(`${API_BASE}/api/v1/flow/characters`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '캐릭터 목록을 불러오지 못했습니다.');
  }
  return res.json();
}

/** 캐릭터 상세 정보 조회. 로그인 필요. */
export async function getFlowCharacter(characterId: number): Promise<FlowCharacterDetail> {
  const res = await fetch(`${API_BASE}/api/v1/flow/characters/${characterId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '캐릭터 정보를 불러오지 못했습니다.');
  }
  return res.json();
}

export interface FlowCardGenerateRequest {
  characterId: number;
  genders: string[];
  attributes: string[];
  types: string[];
}

export interface FlowCardGenerateResponse {
  success: boolean;
  message: string;
  created: number;
  skipped: number;
}

/** 캐릭터에 대한 모든 조합의 FlowCard 생성. 로그인 필요. */
export async function generateFlowCards(request: FlowCardGenerateRequest): Promise<FlowCardGenerateResponse> {
  const res = await fetch(`${API_BASE}/api/v1/flow/characters/${request.characterId}/cards/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      characterId: request.characterId,
      genders: request.genders,
      attributes: request.attributes,
      types: request.types,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '카드 생성에 실패했습니다.');
  }
  return res.json();
}

export interface FlowCard {
  id: number;
  characterId: number;
  gender: string;
  attribute: string;
  type: string;
  prompt?: string | null;
  negativePrompt?: string | null;
  imageUrl?: string | null;
  promptGenerationStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlowCardListResponse {
  success: boolean;
  total: number;
  cards: FlowCard[];
}

/** 캐릭터의 FlowCard 목록 조회 (필터링 지원). 로그인 필요. */
export async function listFlowCards(params?: {
  characterId: number;
  gender?: string;
  attribute?: string;
  type?: string;
}): Promise<FlowCardListResponse> {
  if (!params?.characterId) {
    throw new Error('characterId는 필수입니다.');
  }
  const searchParams = new URLSearchParams();
  if (params.gender != null) searchParams.set('gender', params.gender);
  if (params.attribute != null) searchParams.set('attribute', params.attribute);
  if (params.type != null) searchParams.set('type_val', params.type);

  const res = await fetch(
    `${API_BASE}/api/v1/flow/characters/${params.characterId}/cards?${searchParams.toString()}`,
    {
      headers: authHeaders(),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'FlowCard 목록을 불러오지 못했습니다.');
  }
  return res.json();
}

/** FlowCard 단건 조회. 로그인 필요. */
export async function getFlowCard(cardId: number): Promise<FlowCard> {
  const res = await fetch(`${API_BASE}/api/v1/flow/cards/${cardId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'FlowCard를 불러오지 못했습니다.');
  }
  return res.json();
}

export interface ImagePromptRequest {
  characterId: number;
  gender: string;
  attribute: string;
  type: string;
}

export interface ImagePromptResponse {
  success: boolean;
  prompt: string;
  negativePrompt: string;
  characterSettings: {
    name: string;
    historicalOrMythical: string;
    originCountry: string | null;
    era: string;
    mainArchetype: string;
    legendRank: string;
    mysteryLevel: string;
    divinityPotential: string;
    noblePhantasms: Array<{ 보구명: string; 진명개방: string }>;
    keyAchievements: string[];
    gender: string;
    attribute: string;
    class: string;
  };
}

/** 이미지 프롬프트 생성. 로그인 필요. */
export async function generateImagePrompt(request: ImagePromptRequest): Promise<ImagePromptResponse> {
  const res = await fetch(`${API_BASE}/api/v1/flow/image-prompt`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '이미지 프롬프트 생성에 실패했습니다.');
  }
  return res.json();
}

export interface FlowCardUpdateRequest {
  prompt?: string | null;
  negativePrompt?: string | null;
  imageUrl?: string | null;
  promptGenerationStatus?: string | null;
}

/** FlowCard 이미지 업로드. 로그인 필요. */
export async function uploadFlowCardImage(
  cardId: number,
  file: File
): Promise<FlowCardUpdateResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(`${API_BASE}/api/v1/flow/cards/${cardId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '이미지 업로드에 실패했습니다.');
  }
  return res.json();
}

export interface FlowCardUpdateResponse {
  success: boolean;
  message: string;
}

/** FlowCard 프롬프트 업데이트. 로그인 필요. */
export async function updateFlowCard(
  cardId: number,
  request: FlowCardUpdateRequest
): Promise<FlowCardUpdateResponse> {
  const res = await fetch(`${API_BASE}/api/v1/flow/cards/${cardId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'FlowCard 업데이트에 실패했습니다.');
  }
  return res.json();
}

export interface NoblePhantasmGenerateRequest {
  characterId: number;
  gender: string;
  attribute: string;
  type: string;
  excludeNoblePhantasms?: Array<{ 보구명: string; 진명개방: string }>;
}

export interface NoblePhantasmGenerateResponse {
  success: boolean;
  보구명: string;
  진명개방: string;
}

/** 보구 생성. 로그인 필요. */
export async function generateNoblePhantasm(
  request: NoblePhantasmGenerateRequest
): Promise<NoblePhantasmGenerateResponse> {
  const res = await fetch(`${API_BASE}/api/v1/flow/noble-phantasm/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '보구 생성에 실패했습니다.');
  }
  return res.json();
}

export interface FlavorTextGenerateRequest {
  characterId: number;
  gender: string;
  attribute: string;
  type: string;
}

export interface FlavorTextGenerateResponse {
  success: boolean;
  flavorText: string;
}

/** 플레이버 텍스트 생성. 로그인 필요. */
export async function generateFlavorText(
  request: FlavorTextGenerateRequest
): Promise<FlavorTextGenerateResponse> {
  const res = await fetch(`${API_BASE}/api/v1/flow/flavor-text/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '플레이버 텍스트 생성에 실패했습니다.');
  }
  return res.json();
}

export interface CardDataGenerateRequest {
  characterId: number;
  gender: string;
  attribute: string;
  type: string;
  excludeNoblePhantasms?: Array<{ 보구명: string; 진명개방: string }>;
}

export interface CardDataGenerateResponse {
  success: boolean;
  noblePhantasm1: { 보구명: string; 진명개방: string };
  noblePhantasm2: { 보구명: string; 진명개방: string };
  flavorText: string;
}

/** 카드 데이터 일괄 생성 (보구1, 보구2, 플레이버 텍스트). 로그인 필요. */
export async function generateCardData(
  request: CardDataGenerateRequest
): Promise<CardDataGenerateResponse> {
  const res = await fetch(`${API_BASE}/api/v1/flow/card-data/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '카드 데이터 생성에 실패했습니다.');
  }
  return res.json();
}
