"""
API 사용 로그 스키마
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ApiUsageLogItemSchema(BaseModel):
    """API 사용 로그 단일 항목"""

    id: int
    operationType: str
    model: Optional[str] = None
    inputTokens: Optional[int] = None
    outputTokens: Optional[int] = None
    costUsd: Optional[str] = None
    userId: Optional[int] = None
    extra: Optional[dict[str, Any]] = None
    createdAt: datetime


class ApiUsageLogListResponseSchema(BaseModel):
    """API 사용 로그 목록 응답"""

    success: bool
    total: int
    items: list[ApiUsageLogItemSchema]

