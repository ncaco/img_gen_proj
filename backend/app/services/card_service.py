"""
카드 생성 관련 비즈니스 로직
"""
from app.schemas.card import CardDataSchema, CardGenerationRequestSchema, CardSaveRequestSchema
from app.database.models import Card
from sqlalchemy.orm import Session
from typing import Dict


class CardService:
    """카드 생성 서비스"""
    
    @staticmethod
    def validate_card_data(card_data: CardDataSchema) -> tuple[bool, str]:
        """
        카드 데이터 유효성 검증
        
        Args:
            card_data: 검증할 카드 데이터
            
        Returns:
            (유효성 여부, 에러 메시지)
        """
        if not card_data.cardName or not card_data.cardName.strip():
            return False, "카드명은 필수 입력 항목입니다."
        
        if not card_data.type or not card_data.type.strip():
            return False, "타입은 필수 입력 항목입니다."
        
        if not card_data.attribute or not card_data.attribute.strip():
            return False, "속성은 필수 입력 항목입니다."
        
        if not card_data.rarity or not card_data.rarity.strip():
            return False, "등급은 필수 입력 항목입니다."
        
        return True, ""
    
    @staticmethod
    def generate_prompt(request: CardGenerationRequestSchema) -> str:
        """
        카드 생성 프롬프트 생성
        
        Args:
            request: 카드 생성 요청 데이터
            
        Returns:
            생성된 프롬프트 문자열
        """
        card_data = request.cardData
        
        # 시각적 레이아웃 프롬프트 (ASCII 아트 형태)
        prompt = "트레이딩 카드 게임 스타일의 카드 일러스트를 생성하세요.\n\n"
        prompt += "=== 카드 레이아웃 (시각적 구조) ===\n\n"
        prompt += "┌─────────────────────────────────────────┐\n"
        prompt += "│  [배경 이미지 - Layer 2 (전체 영역)]     │\n"
        prompt += "│  ┌─────────────────────────────────┐   │\n"
        prompt += "│  │                                 │   │\n"
        
        # 상단 헤더
        type_str = card_data.type if card_data.type else "[타입]"
        rarity_str = card_data.rarity if card_data.rarity else "[등급]"
        card_name_str = card_data.cardName if card_data.cardName else "카드명"
        attribute_str = card_data.attribute if card_data.attribute else "[속성]"
        
        prompt += f"│  │  ⭕{type_str}  {rarity_str}  {card_name_str}  {attribute_str}⭕ │\n"
        prompt += "│  │  ─────────────────────────────  │\n"
        prompt += "│  │                                 │\n"
        
        # 메인 캐릭터 이미지
        prompt += "│  │    [메인 캐릭터 이미지 - Layer 1]  │\n"
        prompt += "│  │                                 │\n"
        prompt += "│  │  ─────────────────────────────  │\n"
        
        # 스킬 영역
        if card_data.skill1Name and card_data.skill1Name.strip():
            skill1_name = card_data.skill1Name[:12] if len(card_data.skill1Name) > 12 else card_data.skill1Name
            skill1_desc = card_data.skill1Description[:30] if card_data.skill1Description and len(card_data.skill1Description) > 30 else (card_data.skill1Description or "")
            prompt += f"│  │  [스킬 1] {skill1_name.ljust(20)}│\n"
            prompt += f"│  │  • {skill1_desc.ljust(30)}│\n"
            prompt += "│  │                                 │\n"
        
        if card_data.skill2Name and card_data.skill2Name.strip():
            skill2_name = card_data.skill2Name[:12] if len(card_data.skill2Name) > 12 else card_data.skill2Name
            skill2_desc = card_data.skill2Description[:30] if card_data.skill2Description and len(card_data.skill2Description) > 30 else (card_data.skill2Description or "")
            prompt += f"│  │  [스킬 2] {skill2_name.ljust(20)}│\n"
            prompt += f"│  │  • {skill2_desc.ljust(30)}│\n"
            prompt += "│  │                                 │\n"
        
        prompt += "│  │  ─────────────────────────────  │\n"
        
        # 플레이버 텍스트
        if card_data.flavorText and card_data.flavorText.strip():
            flavor_text = card_data.flavorText[:35] if len(card_data.flavorText) > 35 else card_data.flavorText
            prompt += f"│  │  \"{flavor_text.ljust(35)}\"│\n"
            prompt += "│  │                                 │\n"
        
        # 공격력/체력
        attack_str = card_data.attack if card_data.attack else "0"
        health_str = card_data.health if card_data.health else "0"
        stats = f"⚔️ {attack_str}  ❤️ {health_str}"
        prompt += f"│  │  {stats.ljust(35)}│\n"
        prompt += "│  │                                 │\n"
        
        # 메타 정보 (card_number는 DB에서 자동 생성되므로 프롬프트에서는 제외)
        series_str = card_data.series if card_data.series else "[시리즈]"
        meta_info = series_str
        prompt += f"│  │  {meta_info.ljust(35)}│\n"
        prompt += "│  └─────────────────────────────────┘   │\n"
        prompt += "└─────────────────────────────────────────┘\n"
        prompt += "(모든 텍스트는 투명 배경 오버레이로 배경 위에 표시)\n\n"
        
        # 구조화된 데이터 프롬프트
        prompt += "=== 카드 데이터 (구조화된 정보) ===\n\n"
        
        card_data_dict = {
            "layout": {
                "layer2": {
                    "type": "배경 이미지",
                    "description": "카드 전체를 덮는 배경 이미지",
                    "reference": request.backgroundImageUrl or "없음"
                },
                "layer1": {
                    "type": "메인 캐릭터 이미지",
                    "description": "배경 위 중앙에 배치되는 메인 캐릭터",
                    "reference": request.characterImageUrl or "없음"
                }
            },
            "header": {
                "type": type_str,
                "rarity": rarity_str,
                "cardName": card_name_str,
                "attribute": attribute_str
            },
            "skills": [],
            "stats": {
                "attack": attack_str,
                "health": health_str
            },
            "description": card_data.flavorText if card_data.flavorText else None,
            "meta": {
                "series": series_str
            }
        }
        
        # 스킬 추가
        if card_data.skill1Name and card_data.skill1Name.strip():
            card_data_dict["skills"].append({
                "name": card_data.skill1Name,
                "description": card_data.skill1Description or ""
            })
        
        if card_data.skill2Name and card_data.skill2Name.strip():
            card_data_dict["skills"].append({
                "name": card_data.skill2Name,
                "description": card_data.skill2Description or ""
            })
        
        import json
        prompt += json.dumps(card_data_dict, ensure_ascii=False, indent=2)
        prompt += "\n\n"
        
        # 스타일 가이드
        prompt += "=== 스타일 가이드 ===\n"
        prompt += "- 트레이딩 카드 게임 스타일 (포켓몬카드, 원피스카드 등 참고)\n"
        prompt += "- 모든 텍스트는 투명도가 높은 배경 위에 오버레이로 표시\n"
        prompt += "- 배경 이미지가 카드 전체를 덮고, 그 위에 캐릭터와 텍스트가 배치됨\n"
        prompt += "- 상세하고 전문적인 일러스트 품질\n"
        prompt += "- 카드 비율: 5:7 (세로형, 400x560px 기준)\n"
        
        return prompt
    
    @staticmethod
    def save_card(db: Session, request: CardSaveRequestSchema) -> Card:
        """
        카드 정보를 데이터베이스에 저장
        
        Args:
            db: 데이터베이스 세션
            request: 카드 저장 요청 데이터
            
        Returns:
            Card: 저장된 카드 객체
        """
        card_data = request.cardData
        
        # 카드 모델 생성 (card_sn는 DB에서 자동 생성되므로 설정하지 않음)
        card = Card(
            card_name=card_data.cardName,
            card_number=card_data.cardNumber or None,
            type=card_data.type,
            attribute=card_data.attribute,
            rarity=card_data.rarity,
            attack=card_data.attack or "0",
            health=card_data.health or "0",
            skill1_name=card_data.skill1Name or None,
            skill1_description=card_data.skill1Description or None,
            skill2_name=card_data.skill2Name or None,
            skill2_description=card_data.skill2Description or None,
            flavor_text=card_data.flavorText or None,
            series=card_data.series or None,
            character_image_url=request.characterImageUrl or None,
            background_image_url=request.backgroundImageUrl or None,
            generated_prompt=request.generatedPrompt or None,
            generated_image_url=request.generatedImageUrl or None,
        )
        
        # 데이터베이스에 저장
        db.add(card)
        db.flush()  # flush를 먼저 호출하여 ID 생성
        db.commit()
        db.refresh(card)
        
        return card
    
    @staticmethod
    def get_all_cards(db: Session, skip: int = 0, limit: int = 100):
        """
        모든 카드 목록 조회
        
        Args:
            db: 데이터베이스 세션
            skip: 건너뛸 개수 (페이지네이션)
            limit: 가져올 최대 개수
            
        Returns:
            tuple: (카드 목록, 전체 개수)
        """
        from app.database.models import Card
        
        # 전체 개수 조회
        total = db.query(Card).count()
        
        # 카드 목록 조회 (최신순)
        cards = db.query(Card).order_by(Card.card_sn.desc()).offset(skip).limit(limit).all()
        
        return cards, total
