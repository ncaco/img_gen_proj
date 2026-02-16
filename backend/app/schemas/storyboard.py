"""
스토리보드·스토리보드 씬 스키마
"""
from pydantic import BaseModel, Field
from typing import Optional


class StoryboardSceneItemSchema(BaseModel):
    """씬 한 건 (요청/응답 공용)"""
    id: Optional[int] = Field(None, description="씬 ID (수정 시)")
    sortOrder: int = Field(1, description="표시 순서 (1부터)")
    content: str = Field("", description="씬 내용")
    durationSeconds: int = Field(0, ge=0, description="진행 시간(초)")


class StoryboardSceneResponseSchema(BaseModel):
    """씬 응답 (camelCase)"""
    id: int
    sortOrder: int
    content: str
    durationSeconds: int


class StoryboardResponseSchema(BaseModel):
    """스토리보드 응답 (카드별 1개 + 씬 목록)"""
    id: int
    cardSn: int
    scenes: list[StoryboardSceneResponseSchema] = Field(default_factory=list)


class StoryboardSaveRequestSchema(BaseModel):
    """스토리보드 저장 요청 (씬 목록 전체 교체)"""
    scenes: list[StoryboardSceneItemSchema] = Field(default_factory=list)
