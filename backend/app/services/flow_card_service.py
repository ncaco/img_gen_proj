"""
FlowCard 서비스: 캐릭터별 카드 조합 생성 및 관리
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from app.database.models import FlowCard, FlowCharacter, Category, CategoryType


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
        카테고리 순서 기준으로 정렬
        
        Args:
            db: 데이터베이스 세션
            character_id: 캐릭터 ID
            gender: 성별 필터 (선택)
            attribute: 속성 필터 (선택)
            type_val: 클래스 필터 (선택)
            
        Returns:
            list: FlowCard 목록 (카테고리 순서 기준 정렬)
        """
        query = db.query(FlowCard).filter(FlowCard.character_id == character_id)

        if gender:
            query = query.filter(FlowCard.gender == gender)
        if attribute:
            query = query.filter(FlowCard.attribute == attribute)
        if type_val:
            query = query.filter(FlowCard.type == type_val)

        # 먼저 카드를 가져옴
        cards = query.all()
        
        # 카테고리 타입 조회
        gender_type = db.query(CategoryType).filter(CategoryType.type_key == 'gender', CategoryType.deleted_at.is_(None)).first()
        attribute_type = db.query(CategoryType).filter(CategoryType.type_key == 'attribute', CategoryType.deleted_at.is_(None)).first()
        class_type = db.query(CategoryType).filter(CategoryType.type_key == 'class', CategoryType.deleted_at.is_(None)).first()
        
        # 카테고리 name -> sort_order 매핑 생성
        gender_map = {}
        attribute_map = {}
        class_map = {}
        
        if gender_type:
            # gender는 2뎁스만 사용 (parent_id가 NULL)
            gender_categories = db.query(Category).filter(
                Category.type_id == gender_type.id,
                Category.parent_id.is_(None),
                Category.deleted_at.is_(None)
            ).all()
            gender_map = {cat.name: cat.sort_order for cat in gender_categories}
        
        if attribute_type:
            # attribute는 2뎁스만 사용 (parent_id가 NULL)
            attribute_categories = db.query(Category).filter(
                Category.type_id == attribute_type.id,
                Category.parent_id.is_(None),
                Category.deleted_at.is_(None)
            ).all()
            attribute_map = {cat.name: cat.sort_order for cat in attribute_categories}
        
        if class_type:
            # class는 2뎁스만 사용 (parent_id가 NULL)
            class_categories = db.query(Category).filter(
                Category.type_id == class_type.id,
                Category.parent_id.is_(None),
                Category.deleted_at.is_(None)
            ).all()
            class_map = {cat.name: cat.sort_order for cat in class_categories}
        
        # 카테고리 순서 기준으로 정렬
        # 1순위: gender sort_order
        # 2순위: attribute sort_order
        # 3순위: type sort_order
        # 4순위: id (동일한 경우)
        def get_sort_key(card: FlowCard) -> tuple:
            gender_order = gender_map.get(card.gender, 999999)
            attribute_order = attribute_map.get(card.attribute, 999999)
            type_order = class_map.get(card.type, 999999)
            return (gender_order, attribute_order, type_order, card.id)
        
        return sorted(cards, key=get_sort_key)

    @staticmethod
    def update_card(
        db: Session,
        card_id: int,
        prompt: str | None = None,
        negative_prompt: str | None = None,
        image_url: str | None = None,
        prompt_generation_status: str | None = None,
    ) -> FlowCard | None:
        """
        FlowCard의 프롬프트, 네거티브 프롬프트, 이미지 URL, 프롬프트 생성 상태 업데이트
        
        Args:
            db: 데이터베이스 세션
            card_id: 카드 ID
            prompt: 프롬프트 (선택)
            negative_prompt: 네거티브 프롬프트 (선택)
            image_url: 이미지 URL (선택)
            prompt_generation_status: 프롬프트 생성 상태 (선택, null: 미요청, 'requested': 요청중, 'completed': 완료)
            
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
        if image_url is not None:
            card.image_url = image_url
        if prompt_generation_status is not None:
            card.prompt_generation_status = prompt_generation_status

        db.commit()
        db.refresh(card)
        return card

    @staticmethod
    def find_card_by_character_and_attributes(
        db: Session,
        character_id: int,
        gender: str,
        attribute: str,
        type_val: str,
    ) -> FlowCard | None:
        """
        캐릭터 ID와 속성 조합으로 FlowCard 찾기
        
        Args:
            db: 데이터베이스 세션
            character_id: 캐릭터 ID
            gender: 성별
            attribute: 속성
            type_val: 클래스
            
        Returns:
            FlowCard: 찾은 카드 또는 None
        """
        return (
            db.query(FlowCard)
            .filter(
                FlowCard.character_id == character_id,
                FlowCard.gender == gender,
                FlowCard.attribute == attribute,
                FlowCard.type == type_val,
            )
            .first()
        )

    @staticmethod
    def get_or_create_card(
        db: Session,
        character_id: int,
        gender: str,
        attribute: str,
        type_val: str,
    ) -> FlowCard:
        """
        캐릭터 ID와 속성 조합의 FlowCard를 반환하고, 없으면 생성 후 반환.
        (풀오토 프롬프트 생성 시 카드가 없어도 flow_cards에 저장하기 위함)
        """
        card = FlowCardService.find_card_by_character_and_attributes(
            db=db,
            character_id=character_id,
            gender=gender,
            attribute=attribute,
            type_val=type_val,
        )
        if card:
            return card
        character = db.query(FlowCharacter).filter(FlowCharacter.id == character_id).first()
        if not character:
            raise ValueError(f"캐릭터 ID {character_id}를 찾을 수 없습니다.")
        flow_card = FlowCard(
            character_id=character_id,
            gender=gender,
            attribute=attribute,
            type=type_val,
            prompt=None,
            negative_prompt=None,
        )
        db.add(flow_card)
        db.commit()
        db.refresh(flow_card)
        return flow_card
