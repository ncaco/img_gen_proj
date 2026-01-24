"""
데이터베이스 모델 정의
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database.database import Base


class Card(Base):
    """
    카드 모델
    """
    __tablename__ = "cards"
    
    # 기본 필드 (PK)
    card_sn = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="카드 일련번호 (PK, 자동생성)")
    
    # 카드 기본 정보
    card_name = Column(String(100), nullable=False, index=True, comment="카드명")
    card_number = Column(String(50), nullable=True, comment="카드번호 (사용자 입력)")
    type = Column(String(50), nullable=False, comment="카드 타입")
    attribute = Column(String(50), nullable=False, comment="카드 속성")
    rarity = Column(String(50), nullable=False, comment="카드 등급")
    
    # 스탯
    attack = Column(String(10), default="0", comment="공격력")
    health = Column(String(10), default="0", comment="체력")
    
    # 스킬 정보
    skill1_name = Column(String(100), nullable=True, comment="스킬 1 이름")
    skill1_description = Column(Text, nullable=True, comment="스킬 1 설명")
    skill2_name = Column(String(100), nullable=True, comment="스킬 2 이름")
    skill2_description = Column(Text, nullable=True, comment="스킬 2 설명")
    
    # 추가 정보
    flavor_text = Column(Text, nullable=True, comment="플레이버 텍스트")
    series = Column(String(100), nullable=True, comment="시리즈/제작자 정보")
    
    # 이미지 URL
    character_image_url = Column(Text, nullable=True, comment="캐릭터 이미지 URL")
    background_image_url = Column(Text, nullable=True, comment="배경 이미지 URL")
    
    # 생성된 콘텐츠
    generated_prompt = Column(Text, nullable=True, comment="생성된 프롬프트")
    generated_image_url = Column(Text, nullable=True, comment="생성된 이미지 URL")
    
    # 메타데이터
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시"
    )
    
    def __repr__(self):
        return f"<Card(card_sn={self.card_sn}, card_number='{self.card_number}', card_name='{self.card_name}', type='{self.type}')>"


class CardGenerationHistory(Base):
    """
    카드 생성 히스토리 모델
    """
    __tablename__ = "card_generation_history"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    card_sn = Column(Integer, nullable=False, index=True, comment="카드 일련번호 (FK)")
    
    # 생성 요청 정보 (JSON 형태로 저장)
    request_data = Column(JSON, nullable=True, comment="요청 데이터")
    
    # 생성 결과
    prompt = Column(Text, nullable=True, comment="생성된 프롬프트")
    image_url = Column(Text, nullable=True, comment="생성된 이미지 URL")
    success = Column(Integer, default=1, comment="성공 여부 (1: 성공, 0: 실패)")
    error_message = Column(Text, nullable=True, comment="에러 메시지")
    
    # 메타데이터
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시"
    )
    
    def __repr__(self):
        return f"<CardGenerationHistory(id={self.id}, card_sn={self.card_sn}, success={self.success})>"
