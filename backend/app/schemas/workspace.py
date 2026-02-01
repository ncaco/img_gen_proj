"""
워크스페이스·플로우 관련 스키마 정의
"""
from pydantic import BaseModel, Field
from typing import Optional, Any


# ----- Workspace -----
class WorkspaceCreateSchema(BaseModel):
    """워크스페이스 생성 요청 (name 생략 시 '새 워크스페이스')"""
    name: Optional[str] = Field(default="새 워크스페이스", description="워크스페이스 이름", max_length=200)


class WorkspaceUpdateSchema(BaseModel):
    """워크스페이스 수정 요청"""
    name: Optional[str] = Field(None, description="워크스페이스 이름", min_length=1, max_length=200)


class WorkspaceResponseSchema(BaseModel):
    """워크스페이스 응답"""
    id: int = Field(..., description="워크스페이스 ID")
    name: str = Field(..., description="워크스페이스 이름")
    userId: int = Field(..., description="소유자 사용자 ID")
    createdAt: str = Field(..., description="생성일시")
    updatedAt: str = Field(..., description="수정일시")


class WorkspaceListResponseSchema(BaseModel):
    """워크스페이스 목록 응답"""
    success: bool = Field(..., description="성공 여부")
    total: int = Field(..., description="전체 개수")
    workspaces: list[WorkspaceResponseSchema] = Field(..., description="워크스페이스 목록")


# ----- Flow -----
class FlowCreateSchema(BaseModel):
    """플로우 생성 요청"""
    name: Optional[str] = Field(None, description="플로우 이름", max_length=200)


class FlowUpdateSchema(BaseModel):
    """플로우 수정 요청 (이름·데이터)"""
    name: Optional[str] = Field(None, description="플로우 이름", max_length=200)
    flowData: Optional[dict[str, Any]] = Field(None, description="react-flow nodes/edges JSON")


class FlowResponseSchema(BaseModel):
    """플로우 응답"""
    id: int = Field(..., description="플로우 ID")
    workspaceId: int = Field(..., description="워크스페이스 ID")
    name: str = Field(..., description="플로우 이름")
    flowData: Optional[dict[str, Any]] = Field(None, description="react-flow 데이터")
    createdAt: str = Field(..., description="생성일시")
    updatedAt: str = Field(..., description="수정일시")


class FlowListResponseSchema(BaseModel):
    """플로우 목록 응답"""
    success: bool = Field(..., description="성공 여부")
    total: int = Field(..., description="전체 개수")
    flows: list[FlowResponseSchema] = Field(..., description="플로우 목록")
