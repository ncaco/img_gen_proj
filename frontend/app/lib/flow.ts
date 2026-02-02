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
  iconicWeaponsOrSymbols: string[];
  keyAchievements: string[];
  suitableForPretender: boolean;
  suitableForForeigner: boolean;
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
