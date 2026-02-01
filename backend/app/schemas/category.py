"""
카테고리 관련 스키마 정의 (1뎁스: CategoryType, 2뎁스: Category)
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ---- 1뎁스: 카테고리 타입 ----
class CategoryTypeCreateSchema(BaseModel):
    """1뎁스(카테고리 타입) 생성 요청 스키마"""
    type_key: str = Field(..., description="타입 키 (영문, 고유, 예: gender, class, attribute)", min_length=1, max_length=50)
    name: str = Field(..., description="표시명 (예: 성별, 클래스, 속성)", min_length=1, max_length=100)
    sort_order: int = Field(default=0, description="정렬 순서")
    is_used: int = Field(default=1, description="사용여부 (1: 사용, 0: 미사용)")


class CategoryTypeUpdateSchema(BaseModel):
    """1뎁스(카테고리 타입) 수정 요청 스키마"""
    type_key: Optional[str] = Field(None, description="타입 키", min_length=1, max_length=50)
    name: Optional[str] = Field(None, description="표시명", min_length=1, max_length=100)
    sort_order: Optional[int] = Field(None, description="정렬 순서")
    is_used: Optional[int] = Field(None, description="사용여부 (1: 사용, 0: 미사용)")


# ---- 2뎁스: 카테고리 항목 ----
class CategoryCreateSchema(BaseModel):
    """2뎁스(카테고리 항목) 생성 요청 스키마"""
    type_id: int = Field(..., description="1뎁스 타입 ID (FK)")
    name: str = Field(..., description="표시명", min_length=1, max_length=100)
    sort_order: int = Field(default=0, description="정렬 순서")
    is_used: int = Field(default=1, description="사용여부 (1: 사용, 0: 미사용)")


class CategoryUpdateSchema(BaseModel):
    """카테고리 수정 요청 스키마"""
    name: Optional[str] = Field(None, description="표시명", min_length=1, max_length=100)
    sort_order: Optional[int] = Field(None, description="정렬 순서")
    is_used: Optional[int] = Field(None, description="사용여부 (1: 사용, 0: 미사용)")


class CategoryResponseSchema(BaseModel):
    """카테고리 응답 스키마 (API는 camelCase)"""
    id: int = Field(..., description="카테고리 ID")
    type: str = Field(..., description="카테고리 타입")
    name: str = Field(..., description="표시명")
    sort_order: int = Field(..., alias="sortOrder", description="정렬 순서")
    is_used: int = Field(..., alias="isUsed", description="사용여부")
    deleted_at: Optional[datetime] = Field(None, alias="deletedAt", description="삭제 시각 (소프트 삭제)")
    created_at: datetime = Field(..., alias="createdAt", description="생성일시")
    updated_at: datetime = Field(..., alias="updatedAt", description="수정일시")

    model_config = {"from_attributes": True, "populate_by_name": True}


class CategoryListResponseSchema(BaseModel):
    """카테고리 목록 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    total: int = Field(..., description="총 개수")
    categories: list[CategoryResponseSchema] = Field(..., description="카테고리 목록")


class CategoryPublicListResponseSchema(BaseModel):
    """플로우 등에서 사용할 카테고리 목록 (사용중·미삭제만, 공개용)"""
    success: bool = Field(..., description="성공 여부")
    gender: list[str] = Field(default_factory=list, description="성별 목록 (name만)")
    class_list: list[str] = Field(default_factory=list, alias="class", description="클래스 목록")
    attribute: list[str] = Field(default_factory=list, description="속성 목록")

    model_config = {"populate_by_name": True}
