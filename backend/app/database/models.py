"""
데이터베이스 모델 정의
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class Card(Base):
    """
    카드 모델
    """
    __tablename__ = "cards"

    # 생성자 (회원 고유키)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True, comment="생성자 사용자 ID (FK)")
    
    # 기본 필드 (PK)
    card_sn = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="카드 일련번호 (PK, 자동생성)")
    # 하위 호환: 기존 DB에 evolve_step 컬럼이 있으면 NOT NULL 이므로 기본값으로 포함 (진화 기능 미사용)
    evolve_step = Column(Integer, nullable=False, default=0, comment="진화 단계 (미사용, 호환용)")

    # 카드 기본 정보
    card_name = Column(String(100), nullable=False, index=True, comment="카드명")
    card_number = Column(String(50), nullable=True, comment="카드번호 (사용자 입력)")
    type = Column(String(50), nullable=False, comment="카드 타입")
    attribute = Column(String(50), nullable=False, comment="카드 속성")
    rarity = Column(String(50), nullable=False, comment="카드 등급")
    gender = Column(String(50), nullable=True, comment="카드 성별 (옵션)")
    
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


class User(Base):
    """
    회원(사용자) 모델
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="사용자 ID (PK)")
    email = Column(String(255), nullable=False, unique=True, index=True, comment="이메일 (로그인 ID)")
    hashed_password = Column(String(255), nullable=False, comment="암호화된 비밀번호")
    display_name = Column(String(100), nullable=True, comment="표시 이름")
    is_admin = Column(Integer, nullable=False, default=0, comment="관리자 여부 (1: 관리자, 0: 일반)")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="가입일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"


class CardGeneratedImage(Base):
    """
    카드 합성이미지 연계 테이블 (card_sn별 AI 생성 합성이미지 목록)
    """
    __tablename__ = "card_generated_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    card_sn = Column(Integer, nullable=False, index=True, comment="카드 일련번호 (FK)")
    image_url = Column(Text, nullable=False, comment="저장 경로 (예: /data/upload/gen/gen_xxx.png)")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="등록일시"
    )

    def __repr__(self):
        return f"<CardGeneratedImage(id={self.id}, card_sn={self.card_sn})>"


class Workspace(Base):
    """
    워크스페이스 모델 (사용자별 플로우 그룹). 소프트 삭제(deleted_at) 지원.
    """
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="워크스페이스 ID (PK)")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, comment="소유자 사용자 ID (FK)")
    name = Column(String(200), nullable=False, comment="워크스페이스 이름")
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="소프트 삭제 시각 (NULL이면 미삭제)",
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    def __repr__(self):
        return f"<Workspace(id={self.id}, name='{self.name}', user_id={self.user_id})>"


class Flow(Base):
    """
    플로우 모델 (react-flow 노드/엣지 저장). 소프트 삭제(deleted_at) 지원.
    """
    __tablename__ = "flows"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="플로우 ID (PK)")
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True, comment="워크스페이스 ID (FK)")
    name = Column(String(200), nullable=False, default="새 플로우", comment="플로우 이름")
    flow_data = Column(JSON, nullable=True, comment="react-flow nodes/edges JSON")
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="소프트 삭제 시각 (NULL이면 미삭제)",
    )
    last_accessed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="마지막 접속 시각",
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    def __repr__(self):
        return f"<Flow(id={self.id}, name='{self.name}', workspace_id={self.workspace_id})>"


class CategoryType(Base):
    """
    1뎁스: 카테고리 타입 (성별/클래스/속성 등). 소프트 삭제 및 사용여부 지원.
    """
    __tablename__ = "category_types"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="타입 ID (PK)")
    type_key = Column(String(50), nullable=False, unique=True, index=True, comment="타입 키 (예: gender, class, attribute)")
    name = Column(String(100), nullable=False, comment="표시명 (예: 성별, 클래스, 속성)")
    sort_order = Column(Integer, nullable=False, default=0, comment="정렬 순서 (작을수록 앞)")
    is_used = Column(Integer, nullable=False, default=1, comment="사용여부 (1: 사용, 0: 미사용)")
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="소프트 삭제 시각 (NULL이면 미삭제)",
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    def __repr__(self):
        return f"<CategoryType(id={self.id}, type_key='{self.type_key}', name='{self.name}')>"


class Category(Base):
    """
    2·3·4뎁스: 카테고리 항목. parent_id NULL + type_id 설정 = 2뎁스, parent_id = 2뎁스 id = 3뎁스, parent_id = 3뎁스 id = 4뎁스.
    """
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="카테고리 ID (PK)")
    type_id = Column(Integer, ForeignKey("category_types.id"), nullable=True, index=True, comment="1뎁스 타입 ID (2뎁스만 직접 설정, 3·4뎁스는 상위에서 상속)")
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True, comment="상위 카테고리 ID (NULL=2뎁스, 있으면 3·4뎁스)")
    type = Column(String(50), nullable=True, index=True, comment="레거시: type_key (마이그레이션 후 제거)")
    name = Column(String(100), nullable=False, comment="표시명")
    sort_order = Column(Integer, nullable=False, default=0, comment="정렬 순서 (작을수록 앞)")
    is_used = Column(Integer, nullable=False, default=1, comment="사용여부 (1: 사용, 0: 미사용)")
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="소프트 삭제 시각 (NULL이면 미삭제)",
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    category_type = relationship("CategoryType", backref="categories", lazy="joined")
    parent = relationship("Category", remote_side=[id], backref="children", lazy="joined")

    def __repr__(self):
        return f"<Category(id={self.id}, type_id={self.type_id}, parent_id={self.parent_id}, name='{self.name}')>"


class FlowCharacter(Base):
    """
    플로우 캐릭터: 캐릭터 설정(이름·설명) + 세계관 분석 결과 저장.
    Run 시 입력으로 레코드 생성 후 GPT 결과로 업데이트.
    """
    __tablename__ = "flow_characters"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="캐릭터 ID (키)")
    flow_id = Column(Integer, ForeignKey("flows.id"), nullable=True, index=True, comment="플로우 ID (FK)")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True, comment="생성자 사용자 ID (FK)")

    # 캐릭터 입력 (Run 전)
    name = Column(String(200), nullable=False, comment="캐릭터 이름")
    description = Column(Text, nullable=True, comment="캐릭터/세계관 설명")

    # 세계관 분석 결과 (GPT Run 후 업데이트)
    historical_or_mythical = Column(String(50), nullable=True, comment="역사/신화 구분")
    origin_country = Column(String(100), nullable=True, comment="출신")
    era = Column(String(100), nullable=True, comment="시대")
    main_archetype = Column(String(50), nullable=True, comment="아키타입")
    legend_rank = Column(String(20), nullable=True, comment="전설성")
    mystery_level = Column(String(20), nullable=True, comment="신비도")
    divinity_potential = Column(String(20), nullable=True, comment="신성")
    noble_phantasms = Column(JSON, nullable=True, comment="보구정보 (JSON 배열, 각 항목은 {'보구명': '', '진명개방': ''} 형태)")
    key_achievements = Column(JSON, nullable=True, comment="업적 (JSON 배열)")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    def __repr__(self):
        return f"<FlowCharacter(id={self.id}, name='{self.name}')>"


class FlowCard(Base):
    """
    플로우 카드: 캐릭터별 성별/속성/클래스 조합에 대한 카드 데이터.
    유니크 키: character_id + gender + attribute + type
    """
    __tablename__ = "flow_cards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="카드 ID (PK)")
    character_id = Column(Integer, ForeignKey("flow_characters.id"), nullable=False, index=True, comment="캐릭터 ID (FK)")
    gender = Column(String(50), nullable=False, comment="성별")
    attribute = Column(String(50), nullable=False, comment="속성")
    type = Column(String(50), nullable=False, comment="클래스 (2뎁스만 저장)")
    prompt = Column(Text, nullable=True, comment="프롬프트 (초기 생성 시 null)")
    negative_prompt = Column(Text, nullable=True, comment="네거티브 프롬프트 (초기 생성 시 null)")
    image_url = Column(Text, nullable=True, comment="카드 이미지 URL (16:9 비율)")
    prompt_generation_status = Column(String(20), nullable=True, comment="프롬프트 생성 상태 (null: 미요청, 'requested': 요청중, 'completed': 완료)")
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    # 유니크 제약조건: character_id + gender + attribute + type
    __table_args__ = (
        UniqueConstraint('character_id', 'gender', 'attribute', 'type', name='uq_flow_card_combination'),
    )

    def __repr__(self):
        return f"<FlowCard(id={self.id}, character_id={self.character_id}, gender='{self.gender}', attribute='{self.attribute}', type='{self.type}')>"


class HeroAutoPool(Base):
    """
    영웅 풀오토 설정: 한 명의 캐릭터에 대해 10개의 서번트 슬롯(10각형)을 자동 배분한 결과를 저장.
    """
    __tablename__ = "hero_auto_pools"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="풀오토 ID (PK)")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, comment="소유자 사용자 ID (FK)")
    character_id = Column(Integer, ForeignKey("flow_characters.id"), nullable=False, index=True, comment="플로우 캐릭터 ID (FK)")

    # 10개 슬롯 정보 (각 슬롯: position, gender, attribute, type 등)
    servants = Column(JSON, nullable=True, comment="서번트 슬롯 정보 배열 (JSON)")

    # 확정 여부: True이면 더 이상 재배분/수정 불가
    is_confirmed = Column(Integer, nullable=False, default=0, comment="확정 여부 (1: 확정, 0: 미확정)")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    def __repr__(self):
        return f"<HeroAutoPool(id={self.id}, user_id={self.user_id}, character_id={self.character_id}, is_confirmed={self.is_confirmed})>"


class ApiUsageLog(Base):
    """
    API 사용 로그: 글생성(LLM)·이미지생성 호출 시 입력/출력 토큰·비용 저장.
    """
    __tablename__ = "api_usage_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="로그 ID (PK)")
    operation_type = Column(String(50), nullable=False, index=True, comment="구분: post_creation(글생성), image_generation(이미지생성)")
    model = Column(String(100), nullable=True, comment="모델명 (예: gpt-4o-mini, gpt-image-1.5)")
    input_tokens = Column(Integer, nullable=True, comment="입력 토큰 수 (이미지 생성 시 NULL)")
    output_tokens = Column(Integer, nullable=True, comment="출력 토큰 수 (이미지 생성 시 NULL)")
    cost_usd = Column(String(20), nullable=True, comment="비용 (USD 문자열, 예: 0.001234)")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True, comment="요청 사용자 ID (선택)")
    extra = Column(JSON, nullable=True, comment="추가 정보 (character_id, card_id 등)")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="처리 시각",
    )

    def __repr__(self):
        return f"<ApiUsageLog(id={self.id}, operation_type='{self.operation_type}', cost_usd='{self.cost_usd}')>"


class CardSnsPost(Base):
    """
    카드별 SNS 게시물: cards(확정 카드)에 대한 SNS 게시문 초안/저장.
    관리자 페이지에서 카드 선택 후 게시물 작성·관리용.
    """
    __tablename__ = "card_sns_posts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="게시물 ID (PK)")
    card_sn = Column(Integer, ForeignKey("cards.card_sn"), nullable=False, index=True, comment="카드 일련번호 (FK)")
    flow_card_id = Column(Integer, ForeignKey("flow_cards.id"), nullable=True, index=True, comment="플로우 카드 ID (출처 추적, 선택)")

    # 게시물 내용
    content = Column(Text, nullable=False, comment="SNS 게시물 본문")
    platform = Column(String(50), nullable=True, comment="플랫폼 구분 (twitter, instagram 등)")
    status = Column(String(20), nullable=False, default="draft", comment="상태: draft(초안), published(게시완료)")
    url = Column(Text, nullable=True, comment="게시된 SNS URL (선택)")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="생성일시",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일시",
    )

    def __repr__(self):
        return f"<CardSnsPost(id={self.id}, card_sn={self.card_sn}, status='{self.status}')>"
