"""
FlowCard 서비스: 캐릭터별 카드 조합 생성 및 관리
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database.models import FlowCard, FlowCharacter


class FlowCardService:
    """FlowCard 서비스"""

    @staticmethod
    def generate_cards_for_character(
        db: Session,
        character_id: int,
        genders: list[str],
        attributes: list[str],
        types: list[str],
    ) -> tuple[int, int]:
        """
        캐릭터에 대한 모든 조합의 FlowCard 생성
        
        Args:
            db: 데이터베이스 세션
            character_id: 캐릭터 ID
            genders: 성별 목록
            attributes: 속성 목록
            types: 클래스 목록
            
        Returns:
            tuple: (생성된 카드 수, 건너뛴 카드 수)
        """
        # 캐릭터 존재 확인
        character = db.query(FlowCharacter).filter(FlowCharacter.id == character_id).first()
        if not character:
            raise ValueError(f"캐릭터 ID {character_id}를 찾을 수 없습니다.")

        created_count = 0
        skipped_count = 0

        # 모든 조합 생성 (카르테시안 곱)
        for gender in genders:
            for attribute in attributes:
                for type_val in types:
                    # 이미 존재하는지 확인
                    existing = (
                        db.query(FlowCard)
                        .filter(
                            FlowCard.character_id == character_id,
                            FlowCard.gender == gender,
                            FlowCard.attribute == attribute,
                            FlowCard.type == type_val,
                        )
                        .first()
                    )

                    if existing:
                        skipped_count += 1
                        continue

                    # 새 카드 생성
                    try:
                        flow_card = FlowCard(
                            character_id=character_id,
                            gender=gender,
                            attribute=attribute,
                            type=type_val,
                            prompt=None,  # 초기 생성 시 null
                            negative_prompt=None,  # 초기 생성 시 null
                        )
                        db.add(flow_card)
                        created_count += 1
                    except IntegrityError:
                        # 동시성 문제로 인한 중복 생성 시 건너뛰기
                        db.rollback()
                        skipped_count += 1
                        continue

        db.commit()
        return created_count, skipped_count

    @staticmethod
    def get_cards_by_character(
        db: Session,
        character_id: int,
        gender: str | None = None,
        attribute: str | None = None,
        type_val: str | None = None,
    ) -> list[FlowCard]:
        """
        캐릭터의 FlowCard 목록 조회 (필터링 지원)
        
        Args:
            db: 데이터베이스 세션
            character_id: 캐릭터 ID
            gender: 성별 필터 (선택)
            attribute: 속성 필터 (선택)
            type_val: 클래스 필터 (선택)
            
        Returns:
            list: FlowCard 목록
        """
        query = db.query(FlowCard).filter(FlowCard.character_id == character_id)

        if gender:
            query = query.filter(FlowCard.gender == gender)
        if attribute:
            query = query.filter(FlowCard.attribute == attribute)
        if type_val:
            query = query.filter(FlowCard.type == type_val)

        # 일관된 정렬 순서 유지: id 순서로 정렬 (생성 순서)
        return query.order_by(FlowCard.id.asc()).all()

    @staticmethod
    def update_prompts(
        db: Session,
        card_id: int,
        prompt: str | None = None,
        negative_prompt: str | None = None,
    ) -> FlowCard | None:
        """
        FlowCard의 프롬프트 및 네거티브 프롬프트 업데이트
        
        Args:
            db: 데이터베이스 세션
            card_id: 카드 ID
            prompt: 프롬프트 (선택)
            negative_prompt: 네거티브 프롬프트 (선택)
            
        Returns:
            FlowCard: 업데이트된 카드 또는 None
        """
        card = db.query(FlowCard).filter(FlowCard.id == card_id).first()
        if not card:
            return None

        if prompt is not None:
            card.prompt = prompt
        if negative_prompt is not None:
            card.negative_prompt = negative_prompt

        db.commit()
        db.refresh(card)
        return card
