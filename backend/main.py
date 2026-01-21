from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(
    title="카드 생성기 API",
    description="트레이딩 카드 게임 스타일의 카드를 생성하는 API 서버",
    version="0.1.0"
)

# CORS 설정 (프론트엔드와 통신을 위해)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 기본 포트
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 카드 데이터 모델
class Skill(BaseModel):
    name: str
    description: str

class CardData(BaseModel):
    cardName: str
    type: str
    attribute: str
    rarity: str
    attack: Optional[str] = ""
    health: Optional[str] = ""
    skill1Name: Optional[str] = ""
    skill1Description: Optional[str] = ""
    skill2Name: Optional[str] = ""
    skill2Description: Optional[str] = ""
    flavorText: Optional[str] = ""
    cardNumber: Optional[str] = ""
    series: Optional[str] = ""

class CardGenerationRequest(BaseModel):
    cardData: CardData
    characterImageUrl: Optional[str] = None
    backgroundImageUrl: Optional[str] = None

class CardGenerationResponse(BaseModel):
    success: bool
    message: str
    prompt: Optional[str] = None
    imageUrl: Optional[str] = None

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "카드 생성기 API 서버",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy"}

@app.post("/api/cards/generate", response_model=CardGenerationResponse)
async def generate_card(request: CardGenerationRequest):
    """
    카드 생성 요청을 처리합니다.
    현재는 프롬프트만 생성하고, 추후 AI 이미지 생성 기능을 추가할 예정입니다.
    """
    try:
        # 카드 데이터 검증
        if not request.cardData.cardName or not request.cardData.type:
            return CardGenerationResponse(
                success=False,
                message="카드명과 타입은 필수 입력 항목입니다."
            )
        
        # 프롬프트 생성 (간단한 예시)
        prompt = f"""
트레이딩 카드 게임 스타일의 카드 일러스트를 생성하세요.

카드명: {request.cardData.cardName}
타입: {request.cardData.type}
속성: {request.cardData.attribute}
등급: {request.cardData.rarity}
공격력: {request.cardData.attack or '0'}
체력: {request.cardData.health or '0'}
"""
        
        if request.cardData.skill1Name:
            prompt += f"\n스킬 1: {request.cardData.skill1Name} - {request.cardData.skill1Description or ''}"
        
        if request.cardData.skill2Name:
            prompt += f"\n스킬 2: {request.cardData.skill2Name} - {request.cardData.skill2Description or ''}"
        
        if request.cardData.flavorText:
            prompt += f"\n플레이버 텍스트: {request.cardData.flavorText}"
        
        return CardGenerationResponse(
            success=True,
            message="카드 생성 요청이 성공적으로 처리되었습니다.",
            prompt=prompt
        )
    
    except Exception as e:
        return CardGenerationResponse(
            success=False,
            message=f"카드 생성 중 오류가 발생했습니다: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
